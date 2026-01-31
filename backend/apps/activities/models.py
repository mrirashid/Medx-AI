from django.db import models
from apps.common.models import BaseModel
from apps.users.models import User


class Activity(BaseModel):
    """
    Audit trail for all system actions.
    Tracks every mutation (create/update/delete/save/discard) for compliance.
    """
    
    # Action types
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'
    ACTION_SAVE = 'save'
    ACTION_DISCARD = 'discard'
    ACTION_PREDICT = 'predict'
    ACTION_GENERATE = 'generate'
    ACTION_ASSIGN = 'assign'
    ACTION_LOGIN = 'login'
    ACTION_LOGOUT = 'logout'
    
    ACTION_CHOICES = [
        (ACTION_CREATE, 'Create'),
        (ACTION_UPDATE, 'Update'),
        (ACTION_DELETE, 'Delete'),
        (ACTION_SAVE, 'Save'),
        (ACTION_DISCARD, 'Discard'),
        (ACTION_PREDICT, 'Predict'),
        (ACTION_GENERATE, 'Generate'),
        (ACTION_ASSIGN, 'Assign'),
        (ACTION_LOGIN, 'Login'),
        (ACTION_LOGOUT, 'Logout'),
    ]
    
    # Entity types
    ENTITY_USER = 'user'
    ENTITY_PATIENT = 'patient'
    ENTITY_CASE = 'case'
    ENTITY_DOCUMENT = 'document'
    ENTITY_PREDICTION = 'prediction'
    ENTITY_RECOMMENDATION = 'recommendation'
    
    ENTITY_CHOICES = [
        (ENTITY_USER, 'User'),
        (ENTITY_PATIENT, 'Patient'),
        (ENTITY_CASE, 'Case'),
        (ENTITY_DOCUMENT, 'Document'),
        (ENTITY_PREDICTION, 'Prediction'),
        (ENTITY_RECOMMENDATION, 'Recommendation'),
    ]
    
    # Who performed the action
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activities',
        help_text="User who performed the action"
    )
    
    # What action was performed
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        help_text="Type of action performed"
    )
    
    # What entity was affected
    entity_type = models.CharField(
        max_length=20,
        choices=ENTITY_CHOICES,
        help_text="Type of entity affected"
    )
    entity_id = models.UUIDField(
        help_text="UUID of the affected entity"
    )
    
    # Additional context
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional details about the action (e.g., changed fields, old/new values)"
    )
    
    # Request metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the request"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string from the request"
    )
    
    class Meta:
        db_table = 'activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
    
    def __str__(self):
        user_name = self.user.full_name if self.user else "System"
        return f"{user_name} {self.action} {self.entity_type} at {self.created_at}"
    
    @property
    def description(self):
        """Generate human-readable description of the activity"""
        user_name = self.user.full_name if self.user else "System"
        action_map = {
            self.ACTION_CREATE: 'created',
            self.ACTION_UPDATE: 'updated',
            self.ACTION_DELETE: 'deleted',
            self.ACTION_SAVE: 'saved',
            self.ACTION_DISCARD: 'discarded',
            self.ACTION_PREDICT: 'ran prediction on',
            self.ACTION_GENERATE: 'generated recommendation for',
            self.ACTION_ASSIGN: 'assigned',
            self.ACTION_LOGIN: 'logged in',
            self.ACTION_LOGOUT: 'logged out',
        }
        
        action_text = action_map.get(self.action, self.action)
        entity_name = self.details.get('entity_name', self.entity_type)
        
        return f"{user_name} {action_text} {entity_name}"
