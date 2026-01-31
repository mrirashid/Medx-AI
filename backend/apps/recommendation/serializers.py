from rest_framework import serializers
from .models import ClinicalRecommendation


class ClinicalRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for clinical recommendations"""
    
    generated_by_name = serializers.CharField(
        source='generated_by.get_full_name',
        read_only=True
    )
    prediction_her2_status = serializers.CharField(
        source='prediction.her2_status',
        read_only=True
    )
    prediction_risk_level = serializers.CharField(
        source='prediction.risk_level',
        read_only=True
    )
    prediction_confidence = serializers.FloatField(
        source='prediction.confidence',
        read_only=True
    )
    
    class Meta:
        model = ClinicalRecommendation
        fields = [
            'id',
            'case',
            'prediction',
            'prediction_her2_status',
            'prediction_risk_level',
            'prediction_confidence',
            'clinical_notes',
            'patient_history_text',
            'recommendation_text',
            'clinical_assessment',
            'treatment_recommendations',
            'followup_schedule',
            'risk_mitigation',
            'status',
            'model_version',
            'generated_by',
            'generated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'recommendation_text',
            'clinical_assessment',
            'treatment_recommendations',
            'followup_schedule',
            'risk_mitigation',
            'model_version',
            'created_at',
            'updated_at',
        ]


class GenerateRecommendationRequestSerializer(serializers.Serializer):
    """Request serializer for generating recommendations"""
    
    prediction_id = serializers.UUIDField(required=True)
    clinical_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Doctor's clinical observations"
    )
    history_document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        help_text="List of document IDs containing patient history (will extract OCR text)"
    )


class UpdateRecommendationStatusSerializer(serializers.Serializer):
    """Serializer for updating recommendation status"""
    
    status = serializers.ChoiceField(
        choices=ClinicalRecommendation.STATUS_CHOICES,
        required=True,
        help_text="New status: 'draft', 'saved', or 'discarded'"
    )
