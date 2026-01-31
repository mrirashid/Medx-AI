# apps/cases/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cases.models import Case
from apps.cases.serializers import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateSerializer,
    CaseUpdateSerializer,
)
from apps.patients.permissions import IsDoctor  # reuse existing role permission
from apps.activities.mixins import ActivityLoggingMixin
from apps.activities.models import Activity
from apps.notifications.services import notify
from apps.notifications.models import Notification


class CaseViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    Case Management (doctor-only):

    - Doctor:
        * list:   only their patients' cases
        * create: for patients assigned to them
        * retrieve/update/destroy: only their own cases
    - Nurse / Superadmin: no access to standard endpoints (403)
    """

    queryset = Case.objects.filter(is_deleted=False).select_related(
        "patient", "created_by"
    ).order_by("-created_at")
    
    # Activity logging configuration
    activity_entity_type = Activity.ENTITY_CASE
    
    def get_activity_details(self, instance):
        """Customize what gets logged for cases"""
        return {
            'case_code': instance.case_code,
            'patient_code': instance.patient.patient_code if instance.patient else None,
            'patient_name': instance.patient.full_name if instance.patient else None,
            'entity_name': f'case {instance.case_code}'
        }

    # -------- permissions ----------
    def get_permissions(self):
        # Deleted/restore/permanent-delete endpoints have their own permission checks
        if self.action in ['list_deleted', 'restore_case', 'permanent_delete']:
            return [IsAuthenticated()]
        # all other case endpoints require doctor + auth
        return [IsAuthenticated(), IsDoctor()]

    # -------- serializer selection ----------
    def get_serializer_class(self):
        if self.action == "list":
            return CaseListSerializer
        if self.action == "retrieve":
            return CaseDetailSerializer
        if self.action == "create":
            return CaseCreateSerializer
        if self.action in ["update", "partial_update"]:
            return CaseUpdateSerializer
        return CaseDetailSerializer

    # -------- queryset scoping ----------
    def get_queryset(self):
        user = self.request.user

        # safety: if somehow non-doctor reaches here, give empty queryset
        if user.role != "doctor":
            return Case.objects.none()

        # doctor sees only cases for patients assigned to them
        queryset = (
            Case.objects
            .filter(
                patient__assigned_doctor=user,
                is_deleted=False,
            )
            .select_related("patient", "created_by")
            .order_by("-created_at")
        )
        
        # Filter by specific patient if provided
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        
        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by risk_level if provided (e.g., critical, high, medium, low)
        risk_level = self.request.query_params.get('risk_level')
        if risk_level:
            queryset = queryset.filter(risk_level__iexact=risk_level)
        
        # Search by case_code or patient name
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(case_code__icontains=search) |
                Q(patient__full_name__icontains=search) |
                Q(patient__patient_code__icontains=search)
            )
        
        return queryset

    # -------- soft delete ----------
    def perform_create(self, serializer):
        """Create case and notify the assigned doctor."""
        case = serializer.save(created_by=self.request.user)
        # Notify doctor about the new case
        doctor = case.patient.assigned_doctor if case.patient else None
        if doctor:
            notify(
                user=doctor,
                title="New case created",
                message=f"Case {case.case_code} for patient {case.patient.full_name} has been created.",
                level=Notification.LEVEL_INFO,
                entity_type=Notification.ENTITY_CASE,
                entity_id=case.id,
                created_by=self.request.user,
            )

    def destroy(self, request, *args, **kwargs):
        case = self.get_object()
        case.delete()  # This cascade soft-deletes related predictions/recommendations
        return Response(
            {"detail": "Case and related data soft-deleted successfully."},
            status=status.HTTP_200_OK,
        )

    # ---------------------------------------------------------
    # LIST DELETED CASES (FOR RESTORE UI)
    # ---------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='deleted')
    def list_deleted(self, request):
        """
        List all soft-deleted cases (for restore functionality)
        
        GET /api/v1/cases/deleted/
        
        Doctors see only their deleted cases, superadmins see all
        """
        user = request.user
        if user.role not in ['doctor', 'superadmin']:
            return Response(
                {'error': 'Only doctors and superadmins can view deleted cases'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == 'doctor':
            # Doctors see only their deleted cases
            deleted_cases = Case.objects.deleted().filter(
                patient__assigned_doctor=user
            ).select_related('patient', 'created_by')
        else:
            # Superadmin sees all deleted cases
            deleted_cases = Case.objects.deleted().select_related('patient', 'created_by')
        
        serializer = CaseListSerializer(deleted_cases, many=True)
        
        return Response({
            'count': deleted_cases.count(),
            'cases': serializer.data
        })

    # ---------------------------------------------------------
    # RESTORE DELETED CASE
    # ---------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='restore')
    def restore_case(self, request, pk=None):
        """
        Restore a soft-deleted case (cascade restores predictions/recommendations)
        
        POST /api/v1/cases/{case_id}/restore/
        
        Doctors can restore their own cases, superadmins can restore any
        """
        user = request.user
        if user.role not in ['doctor', 'superadmin']:
            return Response(
                {'error': 'Only doctors and superadmins can restore cases'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get from deleted cases
            case = Case.objects.deleted().get(pk=pk)
        except Case.DoesNotExist:
            return Response(
                {'error': 'Deleted case not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Doctors can only restore their own cases
        if user.role == 'doctor' and case.patient.assigned_doctor != user:
            return Response(
                {'error': 'You can only restore cases for your assigned patients'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            case.restore()  # This cascade restores related predictions/recommendations
            return Response({
                'status': 'restored',
                'case_code': case.case_code,
                'message': f'Case {case.case_code} and all related data restored successfully'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    # ---------------------------------------------------------
    # PERMANENTLY DELETE CASE (SUPERADMIN ONLY)
    # ---------------------------------------------------------
    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        """
        Permanently delete a case and all related data
        
        DELETE /api/v1/cases/{case_id}/permanent-delete/
        
        Superadmin only - this action cannot be undone!
        Deletes: Case -> Documents -> Predictions -> Recommendations
        """
        user = request.user
        if user.role != 'superadmin':
            return Response(
                {'error': 'Only superadmins can permanently delete cases'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get case (including deleted ones for hard delete)
            case = Case.objects.with_deleted().get(pk=pk)
        except Case.DoesNotExist:
            return Response(
                {'error': 'Case not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        case_code = case.case_code
        patient_name = case.patient.full_name if case.patient else 'Unknown'
        
        try:
            case.hard_delete()  # This triggers CASCADE delete
            return Response({
                'status': 'deleted',
                'message': f'Case {case_code} for {patient_name} and all related data permanently deleted'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
