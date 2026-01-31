from rest_framework import serializers
from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for activity logs"""
    
    user_name = serializers.CharField(
        source='user.get_full_name',
        read_only=True
    )
    user_role = serializers.CharField(
        source='user.role',
        read_only=True
    )
    description = serializers.CharField(read_only=True)
    
    class Meta:
        model = Activity
        fields = [
            'id',
            'user',
            'user_name',
            'user_role',
            'action',
            'entity_type',
            'entity_id',
            'details',
            'description',
            'ip_address',
            'user_agent',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CreateActivitySerializer(serializers.ModelSerializer):
    """Serializer for creating activity logs"""
    
    class Meta:
        model = Activity
        fields = [
            'action',
            'entity_type',
            'entity_id',
            'details',
        ]
