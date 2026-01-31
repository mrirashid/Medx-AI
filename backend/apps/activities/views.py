from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import Activity
from .serializers import ActivitySerializer, CreateActivitySerializer


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing activity logs.
    
    - List activities (filtered by role)
    - Retrieve single activity
    - Filter by entity_type, action, date range
    """
    
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter activities based on user role"""
        user = self.request.user
        
        # Superadmin sees all activities
        if user.role == 'superadmin':
            queryset = Activity.objects.all()
        
        # Doctor sees activities for their patients' cases
        elif user.role == 'doctor':
            # Activities by the doctor or related to their assigned patients
            queryset = Activity.objects.filter(
                Q(user=user) |
                Q(entity_type=Activity.ENTITY_PATIENT, details__assigned_doctor_id=str(user.id)) |
                Q(entity_type=Activity.ENTITY_CASE, details__assigned_doctor_id=str(user.id))
            )
        
        # Nurse sees activities for their patients
        elif user.role == 'nurse':
            # Activities by the nurse or related to their created patients
            queryset = Activity.objects.filter(
                Q(user=user) |
                Q(entity_type=Activity.ENTITY_PATIENT, details__created_by_id=str(user.id))
            )
        
        else:
            queryset = Activity.objects.none()
        
        # Apply filters from query params
        entity_type = self.request.query_params.get('entity_type')
        action = self.request.query_params.get('action')
        
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        if action:
            queryset = queryset.filter(action=action)
        
        return queryset.select_related('user')
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent activities (last 10)"""
        activities = self.get_queryset()[:10]
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_entity(self, request):
        """
        Get activities for a specific entity
        Query params: entity_type, entity_id
        """
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        
        if not entity_type or not entity_id:
            return Response(
                {'error': 'entity_type and entity_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activities = self.get_queryset().filter(
            entity_type=entity_type,
            entity_id=entity_id
        )
        
        serializer = self.get_serializer(activities, many=True)
        return Response(serializer.data)


def log_activity(user, action, entity_type, entity_id, details=None, request=None):
    """
    Helper function to log an activity.
    
    Usage:
        from apps.activities.views import log_activity
        log_activity(
            user=request.user,
            action=Activity.ACTION_CREATE,
            entity_type=Activity.ENTITY_PATIENT,
            entity_id=patient.id,
            details={'patient_code': patient.patient_code},
            request=request
        )
    """
    ip_address = None
    user_agent = ''
    
    if request:
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Get user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    Activity.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent
    )
