# apps/cases/models.py
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel
from apps.common.managers import SoftDeleteManager
from apps.patients.models import Patient


class Case(BaseModel):
    """
    Diagnosis case for a patient.

    ERD-aligned fields:
    - id (from BaseModel → UUID)
    - case_code UNIQUE
    - patient_id FK
    - created_by FK (doctor)
    - has_prediction
    - has_recommendation
    - status
    - is_deleted (from BaseModel)
    - created_at / updated_at (from BaseModel)
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETE = "complete", "Complete"
        CANCELLED = "cancelled", "Cancelled"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    # Note: unique constraint is conditional (via UniqueConstraint in Meta)
    # to allow soft-deleted cases to have same code as new cases
    case_code = models.CharField(max_length=30, unique=False, null=True, blank=True)

    patient = models.ForeignKey(
        Patient,
        related_name="cases",
        on_delete=models.CASCADE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="cases_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"role": "doctor"},
    )

    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        null=True,
        blank=True,
        help_text="Risk level determined by AI prediction"
    )
    has_prediction = models.BooleanField(default=False)
    has_recommendation = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Doctor's notes and observations about this case"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "case_code"]),
        ]
        constraints = [
            # Case code must be unique only for non-deleted cases
            models.UniqueConstraint(
                fields=['case_code'],
                condition=models.Q(is_deleted=False),
                name='unique_active_case_code'
            ),
        ]

    def __str__(self):
        return f"{self.case_code} → {self.patient.full_name}"

    def check_restore_conflicts(self):
        """Check if restoring would conflict with existing active cases"""
        conflicts = []
        
        # Check case_code conflict
        if Case.objects.filter(
            case_code=self.case_code, 
            is_deleted=False
        ).exclude(pk=self.pk).exists():
            conflicts.append('case_code')
        
        return conflicts

    def delete(self, using=None, keep_parents=False):
        """
        Cascade soft delete - marks case and all related predictions/recommendations as deleted.
        """
        from apps.common.exceptions import AlreadyDeletedError
        
        if self.is_deleted:
            raise AlreadyDeletedError(f"Case {self.case_code} is already deleted")
        
        # Soft delete all related predictions
        from apps.ai.models import HER2Prediction
        for prediction in HER2Prediction.objects.filter(case=self, is_deleted=False):
            prediction.is_deleted = True
            prediction.deleted_at = timezone.now()
            prediction.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        
        # Soft delete all related recommendations
        from apps.recommendation.models import ClinicalRecommendation
        for rec in ClinicalRecommendation.objects.filter(case=self, is_deleted=False):
            rec.is_deleted = True
            rec.deleted_at = timezone.now()
            rec.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        
        # Soft delete all related documents
        from apps.documents.models import Document
        for doc in Document.objects.filter(case=self, is_deleted=False):
            doc.is_deleted = True
            doc.deleted_at = timezone.now()
            doc.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        
        # Soft delete this case
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def restore(self):
        """
        Cascade restore - restores case and all related predictions/recommendations.
        """
        from apps.common.exceptions import NotDeletedError, RestoreConflictError
        
        if not self.is_deleted:
            raise NotDeletedError(f"Case {self.case_code} is not deleted")
        
        # Check for conflicts before restoring
        conflicts = self.check_restore_conflicts()
        if conflicts:
            raise RestoreConflictError(
                f"Cannot restore: active record exists with same {', '.join(conflicts)}",
                conflict_fields=conflicts
            )
        
        # Check if patient is active (can't restore case if patient is deleted)
        # Use with_deleted() to access the patient even if soft-deleted
        try:
            patient = Patient.objects.with_deleted().get(pk=self.patient_id)
            if patient.is_deleted:
                raise RestoreConflictError(
                    f"Cannot restore case: patient {patient.patient_code} is deleted. Restore patient first.",
                    conflict_fields=['patient']
                )
        except Patient.DoesNotExist:
            raise RestoreConflictError(
                "Cannot restore case: patient no longer exists.",
                conflict_fields=['patient']
            )
        
        # Restore this case first
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        
        # Restore all related predictions (use model manager with with_deleted)
        from apps.ai.models import HER2Prediction
        deleted_predictions = HER2Prediction.objects.with_deleted().filter(
            case=self, is_deleted=True
        )
        for prediction in deleted_predictions:
            try:
                prediction.is_deleted = False
                prediction.deleted_at = None
                prediction.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
            except Exception:
                pass
        
        # Restore all related recommendations
        from apps.recommendation.models import ClinicalRecommendation
        deleted_recommendations = ClinicalRecommendation.objects.with_deleted().filter(
            case=self, is_deleted=True
        )
        for rec in deleted_recommendations:
            try:
                rec.is_deleted = False
                rec.deleted_at = None
                rec.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
            except Exception:
                pass
        
        # Restore all related documents
        from apps.documents.models import Document
        deleted_documents = Document.objects.with_deleted().filter(
            case=self, is_deleted=True
        )
        for doc in deleted_documents:
            try:
                doc.is_deleted = False
                doc.deleted_at = None
                doc.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
            except Exception:
                pass

    def hard_delete(self):
        """
        Permanently delete case and all related data (CASCADE behavior).
        This will delete: Documents -> Predictions -> Recommendations
        """
        # Use models.Model.delete directly to bypass soft delete logic
        models.Model.delete(self)

    def save(self, *args, **kwargs):
        if not self.case_code:
            # Generate unique case code with retry logic
            # Use _base_manager to count ALL cases (including soft-deleted)
            base_count = Case._base_manager.filter(patient=self.patient).count() + 1
            
            # Try to find a unique code with incrementing counter
            for attempt in range(100):  # Max 100 attempts
                count = base_count + attempt
                potential_code = f"{self.patient.patient_code}-{count:03d}"
                
                # Check if code already exists (for non-deleted cases)
                if not Case.objects.filter(case_code=potential_code, is_deleted=False).exists():
                    self.case_code = potential_code
                    break
            else:
                # Fallback: use timestamp-based code
                import uuid
                self.case_code = f"{self.patient.patient_code}-{uuid.uuid4().hex[:6].upper()}"

        super().save(*args, **kwargs)

