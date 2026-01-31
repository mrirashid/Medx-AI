from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "level",
            "entity_type",
            "entity_id",
            "is_read",
            "is_archived",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")
