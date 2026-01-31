from django.db import models
from apps.common.models import BaseModel
from apps.cases.models import Case
from apps.documents.models import Document
from apps.users.models import User


class HER2Prediction(BaseModel):
    """AI-generated HER2 status predictions from tissue images"""
    
    # HER2 status choices
    HER2_0 = 'HER2_0'
    HER2_1_PLUS = 'HER2_1+'
    HER2_2_PLUS = 'HER2_2+'
    HER2_3_PLUS = 'HER2_3+'
    
    HER2_STATUS_CHOICES = [
        (HER2_0, 'HER2 Negative (0)'),
        (HER2_1_PLUS, 'HER2 Low Positive (1+)'),
        (HER2_2_PLUS, 'HER2 Moderate Positive (2+)'),
        (HER2_3_PLUS, 'HER2 High Positive (3+)'),
    ]
    
    # Risk levels
    RISK_LOW = 'low'
    RISK_MEDIUM = 'medium'
    RISK_HIGH = 'high'
    RISK_CRITICAL = 'critical'
    
    RISK_CHOICES = [
        (RISK_LOW, 'Low'),
        (RISK_MEDIUM, 'Medium'),
        (RISK_HIGH, 'High'),
        (RISK_CRITICAL, 'Critical'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='her2_predictions'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='her2_predictions',
        help_text="The HER2 tissue image analyzed"
    )
    
    # Prediction results
    her2_status = models.CharField(max_length=10, choices=HER2_STATUS_CHOICES)
    confidence = models.FloatField(help_text="Model confidence (0.0-1.0)")
    probabilities = models.JSONField(help_text="All class probabilities")
    
    # Risk assessment
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES)
    risk_score = models.FloatField(help_text="Risk score (0-100)")
    
    # Explainable AI
    gradcam_object_key = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="MinIO path to Grad-CAM heatmap"
    )
    
    # Metadata
    model_version = models.CharField(max_length=20, default='v2.4.1')
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_predictions'
    )
    
    class Meta:
        db_table = 'ai_her2_predictions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['document']),
            models.Index(fields=['her2_status']),
            models.Index(fields=['risk_level']),
        ]
        constraints = [
            # Document prediction must be unique only for non-deleted predictions
            models.UniqueConstraint(
                fields=['document'],
                condition=models.Q(is_deleted=False),
                name='unique_active_prediction_per_document'
            )
        ]
    
    def __str__(self):
        return f"HER2 {self.her2_status} prediction for {self.case.case_code}"