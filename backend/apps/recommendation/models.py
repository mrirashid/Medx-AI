from django.db import models
from apps.common.models import BaseModel
from apps.cases.models import Case
from apps.ai.models import HER2Prediction
from apps.users.models import User


class ClinicalRecommendation(BaseModel):
    """LLM-generated clinical recommendations based on HER2 predictions + patient history"""
    
    # Status choices
    STATUS_DRAFT = 'draft'
    STATUS_SAVED = 'saved'
    STATUS_DISCARDED = 'discarded'
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SAVED, 'Saved'),
        (STATUS_DISCARDED, 'Discarded'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='recommendations',
        help_text="Case this recommendation belongs to"
    )
    
    prediction = models.ForeignKey(
        HER2Prediction,
        on_delete=models.CASCADE,
        related_name='recommendations',
        help_text="HER2 prediction this recommendation is based on"
    )
    
    # Input context (what was sent to LLM)
    clinical_notes = models.TextField(
        blank=True,
        help_text="Doctor's clinical observations and notes"
    )
    patient_history_text = models.TextField(
        blank=True,
        help_text="Extracted text from uploaded history documents (OCR)"
    )
    
    # LLM Output
    recommendation_text = models.TextField(
        help_text="Generated clinical recommendations from Gemini LLM"
    )
    
    clinical_assessment = models.TextField(
        blank=True,
        help_text="LLM's clinical assessment summary"
    )
    treatment_recommendations = models.JSONField(
        default=list,
        help_text="Structured treatment recommendations (list of strings)"
    )
    followup_schedule = models.JSONField(
        default=list,
        help_text="Suggested follow-up timeline (list of strings)"
    )
    risk_mitigation = models.JSONField(
        default=list,
        help_text="Risk mitigation strategies (list of strings)"
    )
    
    # Metadata
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT
    )
    model_version = models.CharField(
        max_length=50,
        default='gemini-2.5-flash',
        help_text="Gemini model version used"
    )
    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_recommendations'
    )
    
    class Meta:
        db_table = 'recommendation_clinical'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['prediction']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Recommendation for {self.case.case_code} - {self.status}"
