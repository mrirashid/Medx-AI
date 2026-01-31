from django.conf import settings
from django.db import models

from apps.common.models import BaseModel


class Notification(BaseModel):
    LEVEL_INFO = "info"
    LEVEL_SUCCESS = "success"
    LEVEL_WARNING = "warning"
    LEVEL_ERROR = "error"

    LEVEL_CHOICES = [
        (LEVEL_INFO, "Info"),
        (LEVEL_SUCCESS, "Success"),
        (LEVEL_WARNING, "Warning"),
        (LEVEL_ERROR, "Error"),
    ]

    ENTITY_USER = "user"
    ENTITY_PATIENT = "patient"
    ENTITY_CASE = "case"
    ENTITY_DOCUMENT = "document"
    ENTITY_PREDICTION = "prediction"
    ENTITY_RECOMMENDATION = "recommendation"

    ENTITY_CHOICES = [
        (ENTITY_USER, "User"),
        (ENTITY_PATIENT, "Patient"),
        (ENTITY_CASE, "Case"),
        (ENTITY_DOCUMENT, "Document"),
        (ENTITY_PREDICTION, "Prediction"),
        (ENTITY_RECOMMENDATION, "Recommendation"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="Notification recipient",
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_INFO)

    entity_type = models.CharField(max_length=30, choices=ENTITY_CHOICES, blank=True)
    entity_id = models.UUIDField(null=True, blank=True)

    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.title} -> {self.user.email}"
