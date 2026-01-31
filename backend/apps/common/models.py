import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone

from .managers import SoftDeleteManager


class BaseUUIDModel(models.Model):
    """Every table gets a UUID PK."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """Common created/updated timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """Soft delete + timestamp with restore capability."""
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()          # default: hides deleted
    all_objects = SoftDeleteManager()      # alias to access with_deleted()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete - marks record as deleted without removing from DB"""
        from apps.common.exceptions import AlreadyDeletedError
        
        if self.is_deleted:
            raise AlreadyDeletedError(f"{self.__class__.__name__} is already deleted")
        
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    def hard_delete(self):
        """Permanently remove record from database"""
        # Use models.Model.delete directly to bypass soft delete logic
        models.Model.delete(self)
    
    def restore(self):
        """
        Restore a soft-deleted record.
        Checks for conflicts before restoring.
        """
        from apps.common.exceptions import NotDeletedError, RestoreConflictError
        
        if not self.is_deleted:
            raise NotDeletedError(f"{self.__class__.__name__} is not deleted")
        
        # Check for conflicts before restoring
        conflicts = self.check_restore_conflicts()
        if conflicts:
            raise RestoreConflictError(
                f"Cannot restore: active record exists with same {', '.join(conflicts)}",
                conflict_fields=conflicts
            )
        
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
    
    def check_restore_conflicts(self):
        """
        Override in subclass to check for unique constraint conflicts.
        Returns list of field names that would conflict.
        """
        return []  # No conflicts by default


class AuditedModel(models.Model):
    """
    Optional created_by / updated_by links to user.
    This stays abstract, so there’s no migration until a concrete model inherits it.
    """
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        related_name="%(class)s_created",
        on_delete=models.SET_NULL,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        related_name="%(class)s_updated",
        on_delete=models.SET_NULL,
    )

    class Meta:
        abstract = True


class BaseModel(BaseUUIDModel, TimeStampedModel, SoftDeleteModel, AuditedModel):
    """One base to rule them all — inherit this in your real models."""
    class Meta:
        abstract = True
