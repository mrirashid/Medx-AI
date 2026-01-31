from rest_framework import serializers


class ReadOnlyFieldsMixin:
    """Mark fields as read-only in responses (UUID, timestamps, etc.)."""
    class Meta:
        read_only_fields = ("id", "created_at", "updated_at", "is_deleted", "deleted_at")


class BaseModelSerializer(ReadOnlyFieldsMixin, serializers.ModelSerializer):
    """Use this as a base for your model serializers."""
    pass
