# Integration Helper - Add this to each app to auto-log activities

from apps.activities.views import log_activity
from apps.activities.models import Activity


class ActivityLoggingMixin:
    """
    Mixin to automatically log activities in ViewSets.
    Add to any ModelViewSet to enable activity tracking.
    """
    
    # Map of actions to Activity action constants
    activity_action_map = {
        'create': Activity.ACTION_CREATE,
        'update': Activity.ACTION_UPDATE,
        'partial_update': Activity.ACTION_UPDATE,
        'destroy': Activity.ACTION_DELETE,
    }
    
    # Override in your ViewSet
    activity_entity_type = None  # e.g., Activity.ENTITY_PATIENT
    
    def get_activity_details(self, instance):
        """
        Override this to customize what details are logged.
        Default: returns empty dict
        """
        return {}
    
    def perform_create(self, serializer):
        """Override to log create actions"""
        instance = serializer.save()
        
        if self.activity_entity_type:
            log_activity(
                user=self.request.user,
                action=Activity.ACTION_CREATE,
                entity_type=self.activity_entity_type,
                entity_id=instance.id,
                details=self.get_activity_details(instance),
                request=self.request
            )
        
        return instance
    
    def perform_update(self, serializer):
        """Override to log update actions"""
        instance = serializer.save()
        
        if self.activity_entity_type:
            log_activity(
                user=self.request.user,
                action=Activity.ACTION_UPDATE,
                entity_type=self.activity_entity_type,
                entity_id=instance.id,
                details=self.get_activity_details(instance),
                request=self.request
            )
        
        return instance
    
    def perform_destroy(self, instance):
        """Override to log delete actions"""
        details = self.get_activity_details(instance)
        
        if self.activity_entity_type:
            log_activity(
                user=self.request.user,
                action=Activity.ACTION_DELETE,
                entity_type=self.activity_entity_type,
                entity_id=instance.id,
                details=details,
                request=self.request
            )
        
        instance.delete()
