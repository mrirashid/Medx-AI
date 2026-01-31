from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from apps.cases.models import Case
from apps.ai.models import HER2Prediction
from apps.documents.models import Document
from .models import ClinicalRecommendation
from .serializers import (
    ClinicalRecommendationSerializer,
    GenerateRecommendationRequestSerializer,
    UpdateRecommendationStatusSerializer
)
from .services.groq_service import get_groq_service
from apps.activities.views import log_activity
from apps.activities.models import Activity
from apps.notifications.services import notify
from apps.notifications.models import Notification


class RecommendationViewSet(viewsets.ViewSet):
    """
    Clinical Recommendation endpoints
    
    - POST /api/v1/cases/{case_id}/recommendations/generate/ - Generate new recommendation
    - POST /api/v1/recommendations/{id}/save/ - Save draft recommendation
    - POST /api/v1/recommendations/{id}/discard/ - Discard recommendation
    - GET /api/v1/cases/{case_id}/recommendations/ - List recommendations for case
    - GET /api/v1/recommendations/{id}/ - Get single recommendation
    """
    
    permission_classes = [IsAuthenticated]
    
    def list(self, request, case_id=None):
        """List all recommendations for a case"""
        case = get_object_or_404(Case, id=case_id)
        
        # Verify access (following same pattern as ai app)
        if not self._can_access_case(request.user, case):
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        recommendations = ClinicalRecommendation.objects.filter(
            case=case
        ).order_by('-created_at')
        
        serializer = ClinicalRecommendationSerializer(recommendations, many=True)
        
        return Response({
            'count': recommendations.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        List all pending (draft) recommendations for the logged-in doctor.
        
        GET /api/v1/recommendations/pending/
        
        Returns all recommendations where:
        - case.patient.assigned_doctor is the current user
        - status is 'draft'
        - case and recommendation are not deleted
        """
        user = request.user
        
        # Build the query based on user role
        if user.role == 'superadmin':
            # Superadmin sees all pending recommendations
            recommendations = ClinicalRecommendation.objects.filter(
                status='draft',
                is_deleted=False,
                case__is_deleted=False
            )
        elif user.role == 'doctor':
            # Doctor sees pending recommendations for cases of their assigned patients
            recommendations = ClinicalRecommendation.objects.filter(
                case__patient__assigned_doctor=user,
                status='draft',
                is_deleted=False,
                case__is_deleted=False
            )
        else:
            # Nurses and others don't have pending recommendations to review
            return Response({
                'count': 0,
                'results': []
            })
        
        # Add case and patient info to recommendations
        recommendations = recommendations.select_related(
            'case', 'case__patient'
        ).order_by('-created_at')
        
        # Build response with case_code and patient_name included
        results = []
        for rec in recommendations:
            rec_data = ClinicalRecommendationSerializer(rec).data
            rec_data['case_code'] = rec.case.case_code if rec.case else None
            rec_data['patient_name'] = rec.case.patient.full_name if rec.case and rec.case.patient else None
            results.append(rec_data)
        
        return Response({
            'count': len(results),
            'results': results
        })
    
    def retrieve(self, request, case_id=None, pk=None):
        """Get single recommendation by ID"""
        recommendation = get_object_or_404(
            ClinicalRecommendation,
            case_id=case_id,
            id=pk
        )
        
        # Verify access
        if not self._can_access_case(request.user, recommendation.case):
            return Response(
                {'error': 'Recommendation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ClinicalRecommendationSerializer(recommendation)
        return Response(serializer.data)
    
    def generate(self, request, case_id=None):
        """
        Generate clinical recommendation using Gemini LLM
        
        POST /api/v1/cases/{case_id}/recommendations/generate/
        
        Body:
        {
            "prediction_id": "uuid",
            "clinical_notes": "optional doctor notes",
            "history_document_ids": ["uuid1", "uuid2"]  # optional
        }
        """
        case = get_object_or_404(Case, id=case_id)
        
        # Verify access
        if not self._can_access_case(request.user, case):
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate request data
        serializer = GenerateRecommendationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        try:
            # Get the prediction
            prediction = get_object_or_404(
                HER2Prediction,
                id=data['prediction_id'],
                case=case
            )
            
            # Extract patient history from documents (if provided)
            patient_history = ""
            if 'history_document_ids' in data:
                patient_history = self._extract_history_from_documents(
                    data['history_document_ids'],
                    case
                )
            
            # Generate recommendation using Groq LLM
            groq_service = get_groq_service()
            recommendation_data = groq_service.generate_recommendation(
                her2_status=prediction.her2_status,
                confidence=prediction.confidence,
                risk_level=prediction.risk_level,
                risk_score=prediction.risk_score,
                probabilities=prediction.probabilities,
                clinical_notes=data.get('clinical_notes', ''),
                patient_history=patient_history
            )
            
            # Combine all text for full recommendation
            full_text = self._format_recommendation_text(recommendation_data)
            
            # Check if there's an existing draft for this case+prediction
            # If yes, UPDATE it instead of creating duplicate
            existing_draft = ClinicalRecommendation.objects.filter(
                case=case,
                prediction=prediction,
                status=ClinicalRecommendation.STATUS_DRAFT
            ).first()
            
            with transaction.atomic():
                if existing_draft:
                    # UPDATE existing draft (regeneration scenario)
                    existing_draft.clinical_notes = data.get('clinical_notes', '')
                    existing_draft.patient_history_text = patient_history
                    existing_draft.recommendation_text = full_text
                    existing_draft.clinical_assessment = recommendation_data['clinical_assessment']
                    existing_draft.treatment_recommendations = recommendation_data['treatment_recommendations']
                    existing_draft.followup_schedule = recommendation_data['followup_schedule']
                    existing_draft.risk_mitigation = recommendation_data['risk_mitigation']
                    existing_draft.model_version = recommendation_data.get('model_version', 'gemini-2.0-flash-exp')
                    existing_draft.generated_by = request.user
                    existing_draft.save()
                    
                    recommendation = existing_draft
                    message = 'Recommendation regenerated successfully'
                    response_status = status.HTTP_200_OK
                else:
                    # CREATE new draft (first generation)
                    recommendation = ClinicalRecommendation.objects.create(
                        case=case,
                        prediction=prediction,
                        clinical_notes=data.get('clinical_notes', ''),
                        patient_history_text=patient_history,
                        recommendation_text=full_text,
                        clinical_assessment=recommendation_data['clinical_assessment'],
                        treatment_recommendations=recommendation_data['treatment_recommendations'],
                        followup_schedule=recommendation_data['followup_schedule'],
                        risk_mitigation=recommendation_data['risk_mitigation'],
                        status=ClinicalRecommendation.STATUS_DRAFT,
                        model_version=recommendation_data.get('model_version', 'gemini-2.0-flash-exp'),
                        generated_by=request.user
                    )
                    message = 'Recommendation generated successfully'
                    response_status = status.HTTP_201_CREATED
                
                # Update case with recommendation info and set to complete
                case.has_recommendation = True
                # If case has both prediction and recommendation, mark as complete
                if case.has_prediction:
                    case.status = 'complete'
                case.save(update_fields=['has_recommendation', 'status'])
                
                # Log recommendation generation activity
                log_activity(
                    user=request.user,
                    action=Activity.ACTION_GENERATE,
                    entity_type=Activity.ENTITY_RECOMMENDATION,
                    entity_id=recommendation.id,
                    details={
                        'case_id': str(case.id),
                        'prediction_id': str(prediction.id),
                        'model_version': recommendation.model_version,
                        'is_regeneration': existing_draft is not None,
                        'entity_name': f'recommendation for case {case.case_code}'
                    },
                    request=request
                )
                
                # Notify doctor about new recommendation
                doctor = case.patient.assigned_doctor if case.patient else None
                if doctor:
                    notify(
                        user=doctor,
                        title="Recommendation generated",
                        message=f"Clinical recommendation for case {case.case_code} is ready for review.",
                        level=Notification.LEVEL_INFO,
                        entity_type=Notification.ENTITY_RECOMMENDATION,
                        entity_id=recommendation.id,
                        created_by=request.user,
                    )
            
            return Response(
                {
                    'recommendation': ClinicalRecommendationSerializer(recommendation).data,
                    'message': message
                },
                status=response_status
            )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate recommendation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, case_id=None, pk=None):
        """
        Update recommendation status (save or discard)
        
        PATCH /api/v1/cases/{case_id}/recommendations/{id}/update-status/
        Body: { "status": "saved" }  or  { "status": "discarded" }
        """
        recommendation = get_object_or_404(
            ClinicalRecommendation,
            case_id=case_id,
            id=pk
        )
        
        # Verify access
        if not self._can_access_case(request.user, recommendation.case):
            return Response(
                {'error': 'Recommendation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate input
        serializer = UpdateRecommendationStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status
        new_status = serializer.validated_data['status']
        recommendation.status = new_status
        recommendation.updated_by = request.user
        recommendation.save(update_fields=['status', 'updated_by', 'updated_at'])
        
        # Log status update activity
        action = Activity.ACTION_SAVE if new_status == ClinicalRecommendation.STATUS_SAVED else Activity.ACTION_DISCARD
        log_activity(
            user=request.user,
            action=action,
            entity_type=Activity.ENTITY_RECOMMENDATION,
            entity_id=recommendation.id,
            details={
                'status': new_status,
                'case_id': str(recommendation.case_id),
                'entity_name': f'recommendation for case {recommendation.case.case_code}'
            },
            request=request
        )
        
        # Custom message based on status
        messages = {
            ClinicalRecommendation.STATUS_SAVED: 'Recommendation saved successfully',
            ClinicalRecommendation.STATUS_DISCARDED: 'Recommendation discarded successfully',
            ClinicalRecommendation.STATUS_DRAFT: 'Recommendation status updated to draft'
        }
        
        return Response(
            {
                'recommendation': ClinicalRecommendationSerializer(recommendation).data,
                'message': messages.get(new_status, 'Status updated successfully')
            }
        )
    
    @action(detail=True, methods=['delete'])
    def delete(self, request, case_id=None, pk=None):
        """
        Hard delete recommendation from database (permanent)
        
        DELETE /api/v1/cases/{case_id}/recommendations/{id}/delete/
        """
        recommendation = get_object_or_404(
            ClinicalRecommendation,
            case_id=case_id,
            id=pk
        )
        
        # Verify access
        if not self._can_access_case(request.user, recommendation.case):
            return Response(
                {'error': 'Recommendation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log deletion activity before removing
        log_activity(
            user=request.user,
            action=Activity.ACTION_DELETE,
            entity_type=Activity.ENTITY_RECOMMENDATION,
            entity_id=recommendation.id,
            details={
                'case_id': str(recommendation.case_id),
                'status': recommendation.status,
                'entity_name': f'recommendation for case {recommendation.case.case_code}'
            },
            request=request
        )

        # Hard delete from database
        recommendation.hard_delete()
        
        return Response(
            {'message': 'Recommendation deleted permanently'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'])
    def save(self, request, case_id=None, pk=None):
        """Save a draft recommendation"""
        recommendation = get_object_or_404(
            ClinicalRecommendation,
            case_id=case_id,
            id=pk
        )
        
        # Verify access
        if not self._can_access_case(request.user, recommendation.case):
            return Response(
                {'error': 'Recommendation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update status to saved
        recommendation.status = ClinicalRecommendation.STATUS_SAVED
        recommendation.save(update_fields=['status', 'updated_at'])
        
        return Response(
            {
                'recommendation': ClinicalRecommendationSerializer(recommendation).data,
                'message': 'Recommendation saved successfully'
            }
        )
    
    @action(detail=True, methods=['post'])
    def discard(self, request, case_id=None, pk=None):
        """Discard a recommendation"""
        recommendation = get_object_or_404(
            ClinicalRecommendation,
            case_id=case_id,
            id=pk
        )
        
        # Verify access
        if not self._can_access_case(request.user, recommendation.case):
            return Response(
                {'error': 'Recommendation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update status to discarded
        recommendation.status = ClinicalRecommendation.STATUS_DISCARDED
        recommendation.save(update_fields=['status', 'updated_at'])
        
        return Response(
            {
                'message': 'Recommendation discarded successfully'
            }
        )
    
    def _can_access_case(self, user, case):
        """Check if user can access this case (same RBAC as ai app)"""
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
    
    def _extract_history_from_documents(self, document_ids, case):
        """Extract OCR text from uploaded history documents"""
        history_texts = []
        
        for doc_id in document_ids:
            try:
                document = Document.objects.get(id=doc_id, case=case)
                if document.ocr_text:
                    history_texts.append(document.ocr_text)
            except Document.DoesNotExist:
                continue
        
        return "\n\n".join(history_texts)
    
    def _format_recommendation_text(self, data):
        """Format the recommendation data into readable text"""
        text = f"""CLINICAL ASSESSMENT:
{data['clinical_assessment']}

TREATMENT RECOMMENDATIONS:
"""
        for i, rec in enumerate(data['treatment_recommendations'], 1):
            text += f"{i}. {rec}\n"
        
        text += "\nFOLLOW-UP SCHEDULE:\n"
        for i, item in enumerate(data['followup_schedule'], 1):
            text += f"{i}. {item}\n"
        
        text += "\nRISK MITIGATION STRATEGIES:\n"
        for i, strategy in enumerate(data['risk_mitigation'], 1):
            text += f"{i}. {strategy}\n"
        
        return text
