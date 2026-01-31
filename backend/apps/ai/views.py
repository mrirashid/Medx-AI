import os
import tempfile
import uuid
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from apps.documents.models import Document
from apps.documents.storage import upload_to_storage, delete_from_storage
from apps.cases.models import Case
from .models import HER2Prediction
from .serializers import HER2PredictionSerializer
from .services.her2_predictor import predictor
from .services.gradcam_generator import gradcam_generator
from .services.image_validator import image_validator
from apps.activities.views import log_activity
from apps.activities.models import Activity
from apps.notifications.services import notify
from apps.notifications.models import Notification
from apps.common.throttles import PredictionRateThrottle


class HER2PredictionViewSet(viewsets.ViewSet):
    """
    AI Prediction endpoints nested under cases.
    
    - POST /api/v1/cases/{case_id}/predictions/predict/ - Upload image + predict
    - GET /api/v1/cases/{case_id}/predictions/ - List predictions for case
    - GET /api/v1/predictions/{id}/ - Get single prediction
    - GET /api/v1/predictions/statistics/ - Get stats
    """
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [PredictionRateThrottle]  # Rate limit: 200 predictions/hour
    
    def list(self, request, case_id=None):
        """List all predictions for a case"""
        case = get_object_or_404(Case, id=case_id)
        
        # Verify access
        if not self._can_access_case(request.user, case):
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        predictions = HER2Prediction.objects.filter(case=case).order_by('-created_at')
        serializer = HER2PredictionSerializer(predictions, many=True)
        
        return Response({
            'count': predictions.count(),
            'results': serializer.data
        })
    
    def retrieve(self, request, case_id=None, pk=None):
        """Get single prediction by ID"""
        prediction = get_object_or_404(HER2Prediction,case_id=case_id, id=pk)
        
        # Verify access
        if not self._can_access_case(request.user, prediction.case):
            return Response(
                {'error': 'Prediction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = HER2PredictionSerializer(prediction)
        return Response(serializer.data)
    
    def destroy(self, request, case_id=None, pk=None):
        """Delete a prediction and all related data (images, gradcam, documents)"""
        prediction = get_object_or_404(HER2Prediction, case_id=case_id, id=pk)
        
        # Verify access
        if not self._can_access_case(request.user, prediction.case):
            return Response(
                {'error': 'Prediction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Step 1: Delete GradCAM from object storage
            if prediction.gradcam_object_key:
                delete_from_storage(prediction.gradcam_object_key)
            
            # Step 2: Delete associated document's file from storage
            if prediction.document:
                if prediction.document.object_key:
                    delete_from_storage(prediction.document.object_key)
                
                # Hard delete the document from database
                prediction.document.hard_delete()
            
            # Step 3: Hard delete the prediction itself
            prediction.hard_delete()
            
            return Response(
                {'message': 'Prediction and all related files deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to delete prediction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def predict(self, request, case_id=None):
        """
        Upload medical image, run HER2 prediction + Grad-CAM.
        
        POST /api/v1/cases/{case_id}/predictions/predict/
        Content-Type: multipart/form-data
        
        Form fields:
        - image: File (required) - Medical imaging file
        - generate_gradcam: boolean (optional, default: true)
        
        Returns:
        - Prediction results (HER2 status, confidence, probabilities)
        - Risk assessment (level, score)
        - Grad-CAM visualization URL (explainable AI)
        - Original image URL
        """
        # Get image file
        image_file = request.FILES.get('image')
        generate_gradcam = request.data.get('generate_gradcam', 'true').lower() == 'true'
        
        if not image_file:
            return Response(
                {'error': 'image file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Fetch case and verify access
            case = get_object_or_404(Case, id=case_id)
            
            if not self._can_access_case(request.user, case):
                return Response(
                    {'error': 'Case not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate file type
            allowed_types = [
                'image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp',
                'application/dicom', 'image/x-dcm',
            ]
            
            if image_file.content_type not in allowed_types:
                return Response(
                    {'error': 'Invalid file type. Allowed: PNG, JPEG, TIFF, BMP, DICOM'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate object key for MinIO
            file_extension = os.path.splitext(image_file.name)[1] or '.png'
            object_key = f"documents/{case.id}/her2_{uuid.uuid4()}{file_extension}"
            
            # Save to temp file for prediction
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
                for chunk in image_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name
            
            try:
                # Validate that this is a medical image
                validation_result = image_validator.validate(tmp_path)
                
                if not validation_result['is_valid']:
                    # Clean up temp file
                    os.unlink(tmp_path)
                    error_msg = validation_result.get('reason') or "Invalid medical image"
                    return Response(
                        {
                            'error': error_msg,
                            'validation_details': {
                                'status': validation_result.get('status', 'rejected'),
                                'confidence': validation_result.get('confidence', 0),
                                'checks': validation_result.get('checks', {}),
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Upload original image to MinIO
                with open(tmp_path, 'rb') as f:
                    upload_to_storage(
                        f.read(),
                        object_key,
                        image_file.content_type
                    )
                
                # Run AI prediction
                prediction_result = predictor.predict(tmp_path)
                
                # Generate Grad-CAM for explainability
                gradcam_object_key = None
                if generate_gradcam:
                    gradcam_object_key = self._generate_and_upload_gradcam(
                        tmp_path,
                        prediction_result['her2_status'],
                        case.id
                    )
                
                # Save document + prediction atomically
                with transaction.atomic():
                    # Create document record
                    document = Document.objects.create(
                        case=case,
                        kind='medical_image',  # Changed from 'her2_tissue'
                        original_filename=image_file.name,  # Changed from 'filename'
                        object_key=object_key,
                        size_bytes=image_file.size,  # Changed from 'size'
                        mime_type=image_file.content_type,
                        created_by=request.user  # Changed from 'uploaded_by'
                    )
                    
                    # Create prediction record
                    prediction = HER2Prediction.objects.create(
                        case=case,
                        document=document,
                        her2_status=prediction_result['her2_status'],
                        confidence=prediction_result['confidence'],
                        probabilities=prediction_result['probabilities'],
                        risk_level=prediction_result['risk_level'],
                        risk_score=prediction_result['risk_score'],
                        gradcam_object_key=gradcam_object_key,
                        model_version=prediction_result['model_version'],
                        requested_by=request.user
                    )
                    
                    # Update case with prediction info
                    case.has_prediction = True
                    case.risk_level = prediction_result['risk_level']
                    # Set status to in_progress (will become complete when recommendation is added)
                    if case.status in ['draft', 'in_progress']:
                        case.status = 'in_progress'
                    case.save(update_fields=['has_prediction', 'risk_level', 'status'])
                    
                    # Log prediction activity
                    log_activity(
                        user=request.user,
                        action=Activity.ACTION_PREDICT,
                        entity_type=Activity.ENTITY_PREDICTION,
                        entity_id=prediction.id,
                        details={
                            'her2_status': prediction.her2_status,
                            'confidence': prediction.confidence,
                            'risk_level': prediction.risk_level,
                            'case_id': str(case.id),
                            'entity_name': f'HER2 prediction for case {case.case_code}'
                        },
                        request=request
                    )
                    
                    # Notify doctor about prediction result
                    doctor = case.patient.assigned_doctor if case.patient else None
                    if doctor:
                        # Determine notification level based on risk
                        if prediction.risk_level in ['critical', 'high']:
                            level = Notification.LEVEL_ERROR if prediction.risk_level == 'critical' else Notification.LEVEL_WARNING
                            title = f"{prediction.risk_level.upper()} risk prediction"
                        else:
                            level = Notification.LEVEL_SUCCESS
                            title = "HER2 prediction completed"
                        
                        notify(
                            user=doctor,
                            title=title,
                            message=f"Case {case.case_code}: {prediction.her2_status} ({prediction.risk_level} risk, {prediction.confidence:.0%} confidence)",
                            level=level,
                            entity_type=Notification.ENTITY_PREDICTION,
                            entity_id=prediction.id,
                            created_by=request.user,
                        )
                
                return Response({
                    'prediction': HER2PredictionSerializer(prediction).data,
                    'message': 'HER2 prediction completed successfully'
                }, status=status.HTTP_201_CREATED)
                
            finally:
                # Cleanup temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                
        except Exception as e:
            return Response(
                {'error': f'Prediction failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def statistics(self, request):
        """Get global prediction statistics"""
        from django.db.models import Count, Avg, Q
        
        # Get all predictions user can access
        queryset = self._get_accessible_predictions(request.user)
        
        stats = {
            'total_predictions': queryset.count(),
            'by_her2_status': list(
                queryset.values('her2_status')
                .annotate(count=Count('id'))
                .order_by('her2_status')
            ),
            'by_risk_level': list(
                queryset.values('risk_level')
                .annotate(count=Count('id'))
                .order_by('risk_level')
            ),
            'avg_confidence': queryset.aggregate(Avg('confidence'))['confidence__avg'],
            'high_risk_count': queryset.filter(
                Q(risk_level='high') | Q(risk_level='critical')
            ).count(),
        }
        
        return Response(stats)
    
    def _can_access_case(self, user, case):
        """
        Check if user can access this case.
        Follows RBAC pattern from cases app - returns False (→ 404) for out-of-scope.
        """
        if user.role == 'superadmin':
            return True
        
        # Doctor: can access cases for their assigned patients
        if user.role == 'doctor':
            if hasattr(case, 'patient') and case.patient:
                if case.patient.assigned_doctor == user:
                    return True
        
        # Nurse: can access cases for patients they created
        if user.role == 'nurse':
            if hasattr(case, 'patient') and case.patient:
                if case.patient.created_by == user:
                    return True
        
        # Fallback: allow if user created the case
        if hasattr(case, 'created_by') and case.created_by == user:
            return True
        
        return False
    
    def _get_accessible_predictions(self, user):
        """Get all predictions user can access based on role"""
        if user.role == 'superadmin':
            return HER2Prediction.objects.all()
        
        # For doctor: their own cases
        # For nurse: cases of patients under their supervising doctor
        # Adjust query based on actual Case/Patient model structure
        
        # Option 1: Filter by case creator
        accessible_cases = Case.objects.all()
        if user.role == 'doctor':
            accessible_cases = Case.objects.filter(created_by=user)
        
        return HER2Prediction.objects.filter(case__in=accessible_cases)
    
    def _generate_and_upload_gradcam(self, image_path, her2_status, case_id):
        """
        Generate Grad-CAM heatmap for explainable AI.
        
        Args:
            image_path: Path to original image
            her2_status: Predicted HER2 class
            case_id: Case UUID
            
        Returns:
            str: MinIO object key for Grad-CAM image
        """
        class_map = {
            'HER2_0': 0,
            'HER2_1+': 1,
            'HER2_2+': 2,
            'HER2_3+': 3
        }
        predicted_class_idx = class_map.get(her2_status, 0)
        
        # Generate Grad-CAM to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='_gradcam.png') as tmp:
            gradcam_temp_path = tmp.name
        
        try:
            gradcam_generator.generate(
                image_path,
                predicted_class_idx,
                gradcam_temp_path
            )
            
            # Upload to MinIO
            gradcam_object_key = f"gradcam/{case_id}/{uuid.uuid4()}_gradcam.png"
            with open(gradcam_temp_path, 'rb') as f:
                upload_to_storage(
                    f.read(),
                    gradcam_object_key,
                    'image/png'
                )
            
            return gradcam_object_key
            
        finally:
            if os.path.exists(gradcam_temp_path):
                os.unlink(gradcam_temp_path)