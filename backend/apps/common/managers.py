from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        # soft delete (bulk)
        return super().update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)


class SoftDeleteManager(models.Manager):
    """Default manager: hides deleted rows."""
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

    # extra manager to access everything when needed (e.g., admins)
    def with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)
    
    def deleted(self):
        """Get only soft-deleted records (for admin/restore views)"""
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=True)

    def hard_delete(self):
        return self.with_deleted().hard_delete()
