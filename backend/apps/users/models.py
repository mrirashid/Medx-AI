from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
import secrets
import uuid

from apps.common.models import BaseUUIDModel, TimeStampedModel, SoftDeleteModel


def get_minio_storage():
    """Lazy storage getter to avoid import-time MinIO connection."""
    from config.minio_storage import MinioMediaStorage
    return MinioMediaStorage()


def user_profile_image_path(instance, filename):
    """Generate upload path: profile_images/<user_id>/profile.<ext>
    Always uses same filename 'profile' so uploads overwrite previous image.
    """
    import os
    ext = os.path.splitext(filename)[1].lower()
    return f"profile_images/{instance.id}/profile{ext}"


class UserManager(BaseUserManager):
    """Custom manager for our user model."""
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.SUPERADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("role") != User.Role.SUPERADMIN:
            raise ValueError("Superuser must have role=SUPERADMIN")

        return self.create_user(email, password, **extra_fields)


class User(BaseUUIDModel, TimeStampedModel, AbstractBaseUser, PermissionsMixin):
    """
    Unified model for doctors, nurses, and superadmins.
    Uses Archive Table approach for deletion - deleted users move to UserArchive.
    """
    
    class Role(models.TextChoices):
        DOCTOR = "doctor", "Doctor"
        NURSE = "nurse", "Nurse"
        SUPERADMIN = "superadmin", "Superadmin"

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)  # Required by Django auth for USERNAME_FIELD
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    profile_image = models.ImageField(
        upload_to=user_profile_image_path,
        storage=get_minio_storage,
        null=True,
        blank=True,
        help_text="User profile picture"
    )

    # Password reset fields
    reset_token = models.CharField(max_length=255, null=True, blank=True, unique=True)
    reset_token_expires = models.DateTimeField(null=True, blank=True)

    # Two-Factor Authentication
    two_factor_enabled = models.BooleanField(default=False, help_text="Whether 2FA is enabled for this user")

    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    def delete(self, using=None, keep_parents=False):
        """
        Archive delete - moves user to UserArchive table instead of deleting.
        This frees up the email for reuse.
        """
        # Move to archive
        UserArchive.objects.create(
            original_id=self.id,
            full_name=self.full_name,
            email=self.email,
            phone_number=self.phone_number,
            role=self.role,
            is_active=self.is_active,
            is_staff=self.is_staff,
            password=self.password,
            two_factor_enabled=self.two_factor_enabled,
            last_login=self.last_login,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
        # Hard delete from main table
        super().delete(using=using, keep_parents=keep_parents)

    def generate_reset_token(self, expires_in_hours=24):
        """Generate a unique password reset token."""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires = timezone.now() + timezone.timedelta(hours=expires_in_hours)
        self.save()
        return self.reset_token

    def verify_reset_token(self, token):
        """Verify if the token is valid and not expired."""
        if self.reset_token != token:
            return False
        if self.reset_token_expires is None or timezone.now() > self.reset_token_expires:
            return False
        return True

    def clear_reset_token(self):
        """Clear the reset token after successful password reset."""
        self.reset_token = None
        self.reset_token_expires = None
        self.save()

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class UserArchive(models.Model):
    """
    Archive table for deleted users.
    Stores all user data for audit/compliance and allows restoration.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_id = models.UUIDField(help_text="Original user ID before deletion")
    
    # Copy of all User fields
    full_name = models.CharField(max_length=150)
    email = models.EmailField()  # Not unique - allows same email to be archived multiple times
    phone_number = models.CharField(max_length=30, blank=True, null=True)
    role = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    password = models.CharField(max_length=128)
    two_factor_enabled = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Original timestamps
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    
    # Archive metadata
    archived_at = models.DateTimeField(auto_now_add=True)
    archived_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archived_users'
    )

    class Meta:
        db_table = 'users_user_archive'
        ordering = ['-archived_at']
        verbose_name = 'Archived User'
        verbose_name_plural = 'Archived Users'

    def __str__(self):
        return f"[ARCHIVED] {self.full_name} ({self.email})"

    def restore(self):
        """
        Restore archived user back to active users table.
        Raises error if email is already in use.
        """
        from apps.common.exceptions import RestoreConflictError
        
        # Check if email is already in use
        if User.objects.filter(email=self.email).exists():
            raise RestoreConflictError(
                f"Cannot restore: email '{self.email}' is already in use by an active user",
                conflict_fields=['email']
            )
        
        # Create new user with archived data
        user = User(
            id=self.original_id,  # Restore with original ID
            full_name=self.full_name,
            email=self.email,
            phone_number=self.phone_number,
            role=self.role,
            is_active=self.is_active,
            is_staff=self.is_staff,
            two_factor_enabled=self.two_factor_enabled,
            last_login=self.last_login,
        )
        user.password = self.password  # Restore hashed password directly
        user.save()
        
        # Delete from archive
        self.delete()
        
        return user
