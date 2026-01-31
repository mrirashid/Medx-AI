from rest_framework import serializers
from django.conf import settings
from .models import HER2Prediction
from apps.documents.storage import get_presigned_url


class HER2PredictionSerializer(serializers.ModelSerializer):
    """Serializer for HER2 prediction results"""
    
    # Related fields
    case_code = serializers.CharField(source='case.case_code', read_only=True)
    patient_name = serializers.SerializerMethodField()
    document_filename = serializers.CharField(source='document.filename', read_only=True)
    
    # Explainable AI - return presigned URLs for direct access
    original_image_url = serializers.SerializerMethodField()
    gradcam_url = serializers.SerializerMethodField()
    
    # User info
    requested_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = HER2Prediction
        fields = [
            'id', 
            'case',
            'case_code',
            'patient_name',
            'document',
            'document_filename',
            
            # Prediction results
            'her2_status',
            'confidence',
            'probabilities',
            
            # Risk assessment
            'risk_level',
            'risk_score',
            
            # Explainable AI
            'original_image_url',
            'gradcam_url',
            
            # Metadata
            'model_version',
            'requested_by',
            'requested_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'her2_status',
            'confidence',
            'probabilities',
            'risk_level',
            'risk_score',
            'gradcam_object_key',
            'model_version',
            'created_at',
            'updated_at'
        ]
    
    def get_patient_name(self, obj):
        """Return patient full name"""
        try:
            return obj.case.patient.full_name
        except:
            return None
    
    def get_requested_by_name(self, obj):
        """Return user who requested prediction"""
        if obj.requested_by:
            return obj.requested_by.full_name
        return None
    
    def get_original_image_url(self, obj):
        """Return presigned URL for the original image"""
        try:
            if obj.document and obj.document.object_key:
                return get_presigned_url(obj.document.object_key, expires_in=3600)
        except Exception:
            pass
        return None
    
    def get_gradcam_url(self, obj):
        """Return presigned URL for the GradCAM heatmap"""
        try:
            if obj.gradcam_object_key:
                return get_presigned_url(obj.gradcam_object_key, expires_in=3600)
        except Exception:
            pass
        return None