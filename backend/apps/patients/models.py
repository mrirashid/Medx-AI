from django.db import models
from django.conf import settings
from apps.common.models import BaseModel  
import uuid
from django.utils import timezone


class Patient(BaseModel):
    """
    Represents a patient profile created by a nurse and assigned to a doctor.
    Doctors can view their assigned patients; nurses can manage those they created.
    """

    patient_code = models.CharField(max_length=20)  # Removed unique=True, handled by constraint
    full_name = models.CharField(max_length=255)
    identity_number = models.CharField(max_length=50, help_text="IC, Passport, or Identification Number")  # Removed unique=True
    dob = models.DateField(null=True, blank=True, help_text="Date of Birth")
    gender = models.CharField(
        max_length=10,
        choices=[("male", "Male"), ("female", "Female"), ("other", "Other")],
    )

    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    # emergency contact
    emergency_contact_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_relation = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)

    # health info
    medical_history = models.TextField(blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    current_medications = models.TextField(blank=True, null=True)


    # relationships
    assigned_doctor = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    related_name="patients_assigned",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    limit_choices_to={"role": "doctor"},
    )

    created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    related_name="patients_created",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    limit_choices_to={"role": "nurse"},
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Patient code must be unique only for non-deleted patients
            models.UniqueConstraint(
                fields=['patient_code'],
                condition=models.Q(is_deleted=False),
                name='unique_active_patient_code'
            ),
            # Identity number must be unique only for non-deleted patients
            models.UniqueConstraint(
                fields=['identity_number'],
                condition=models.Q(is_deleted=False),
                name='unique_active_identity_number'
            ),
        ]

    def check_restore_conflicts(self):
        """Check if restoring would conflict with existing active patients"""
        conflicts = []
        
        # Check identity_number conflict (this is user-entered and could conflict)
        if Patient.objects.filter(
            identity_number=self.identity_number, 
            is_deleted=False
        ).exclude(pk=self.pk).exists():
            conflicts.append('identity_number')
        
        # patient_code is auto-generated using _base_manager, shouldn't conflict
        # but check anyway for safety
        if Patient.objects.filter(
            patient_code=self.patient_code, 
            is_deleted=False
        ).exclude(pk=self.pk).exists():
            conflicts.append('patient_code')
        
        return conflicts

    def delete(self, using=None, keep_parents=False):
        """
        Cascade soft delete - marks patient and all related cases as deleted.
        """
        from apps.common.exceptions import AlreadyDeletedError
        from apps.cases.models import Case
        
        if self.is_deleted:
            raise AlreadyDeletedError(f"Patient {self.patient_code} is already deleted")
        
        # Soft delete all related cases (which will cascade to predictions)
        for case in Case.objects.filter(patient=self, is_deleted=False):
            case.delete()
        
        # Soft delete this patient
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def restore(self):
        """
        Cascade restore - restores patient and all related cases.
        """
        from apps.common.exceptions import NotDeletedError, RestoreConflictError
        from apps.cases.models import Case
        
        if not self.is_deleted:
            raise NotDeletedError(f"Patient {self.patient_code} is not deleted")
        
        # Check for conflicts before restoring
        conflicts = self.check_restore_conflicts()
        if conflicts:
            raise RestoreConflictError(
                f"Cannot restore: active record exists with same {', '.join(conflicts)}",
                conflict_fields=conflicts
            )
        
        # Restore this patient first
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        
        # Restore all related cases that were deleted (cascade restore)
        deleted_cases = Case.objects.with_deleted().filter(patient=self, is_deleted=True)
        for case in deleted_cases:
            try:
                case.restore()
            except Exception:
                pass  # Continue restoring other cases even if one fails

    def hard_delete(self):
        """
        Permanently delete patient and all related data (CASCADE behavior).
        This will delete: Cases -> Documents -> Predictions -> Recommendations
        """
        # Use models.Model.delete directly to bypass soft delete logic
        models.Model.delete(self)

    # Auto-generate patient code (e.g., PT-2025-0007-fhd8)
    def save(self, *args, **kwargs):
        if not self.patient_code:
            year = timezone.now().year
            count = Patient._base_manager.filter(patient_code__startswith=f"PT-{year}").count() + 1
            self.patient_code = f"PT-{year}-{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.patient_code})"

