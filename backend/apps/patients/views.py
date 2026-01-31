from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q

from apps.patients.models import Patient
from apps.patients.serializers import (
    PatientListSerializer,
    PatientDetailSerializer,
    PatientCreateSerializer,
    PatientUpdateSerializer,
)
from apps.patients.permissions import IsNurse, IsDoctor
from apps.activities.mixins import ActivityLoggingMixin
from apps.activities.models import Activity
from apps.cases.models import Case
from apps.cases.serializers import CaseListSerializer
from apps.notifications.services import notify
from apps.notifications.models import Notification


class PatientViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    RBAC for Patient endpoints:
    - Nurse: full CRUD (list all, retrieve any, create, update any, soft-delete)
    - Doctor: read-only (list/retrieve only assigned patients)
    - Superadmin: NO ACCESS (returns 404 for everything)
    """

    queryset = Patient.objects.filter(is_deleted=False).order_by("-created_at")
    
    # Activity logging configuration
    activity_entity_type = Activity.ENTITY_PATIENT
    
    def get_activity_details(self, instance):
        """Customize what gets logged for patients"""
        return {
            'patient_code': instance.patient_code,
            'full_name': instance.full_name,
            'assigned_doctor_id': str(instance.assigned_doctor.id) if instance.assigned_doctor else None,
            'entity_name': f'patient {instance.patient_code}'
        }

    # ---------------------------------------------------------
    # PERMISSIONS BASED ON ROLE
    # ---------------------------------------------------------
    def get_permissions(self):
        """
        Nurse: full access to all actions
        Doctor: read-only (list, retrieve) - write ops blocked
        Superadmin: completely blocked (queryset returns empty)
        """
        permissions = [IsAuthenticated()]
        
        # Check if user is authenticated before accessing role
        if not self.request.user.is_authenticated:
            return permissions
        
        user = self.request.user

        # Nurse → full CRUD
        if user.role == "nurse":
            return [IsAuthenticated(), IsNurse()]

        # Doctor → can list, retrieve, and view cases
        if user.role == "doctor":
            if self.action in ["list", "retrieve", "cases"]:
                return [IsAuthenticated(), IsDoctor()]
            # Block write operations (create, update, delete)
            raise PermissionDenied("Doctors cannot perform this action on patients.")

        # Superadmin → no access (handled by empty queryset)
        return [IsAuthenticated()]

    # ---------------------------------------------------------
    # SELECT APPROPRIATE SERIALIZER
    # ---------------------------------------------------------
    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        if self.action == "retrieve":
            return PatientDetailSerializer
        if self.action == "create":
            return PatientCreateSerializer
        if self.action in ["update", "partial_update"]:
            return PatientUpdateSerializer
        return PatientDetailSerializer

    # ---------------------------------------------------------
    # ROLE-BASED QUERYSET FILTERING
    # ---------------------------------------------------------
    def get_queryset(self):
        """
        Nurse: sees all patients (search/filter supported)
        Doctor: sees only assigned patients (search/filter supported)
        Superadmin: sees nothing (returns 404 for all)
        """
        user = self.request.user

        # Base queryset respecting soft delete
        qs = Patient.objects.filter(is_deleted=False)

        # Role scoping
        if user.role == "nurse":
            pass  # nurses see all patients
        elif user.role == "doctor":
            qs = qs.filter(assigned_doctor=user)
        else:
            return Patient.objects.none()

        # Search by name or patient_code
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(patient_code__icontains=search)
            )

        # Filter by gender (male/female/other)
        gender = self.request.query_params.get("gender")
        if gender:
            qs = qs.filter(gender__iexact=gender)

        return qs.order_by("-created_at")

    # ---------------------------------------------------------
    # NOTIFY DOCTOR WHEN PATIENT IS ASSIGNED
    # ---------------------------------------------------------
    def perform_create(self, serializer):
        """Create patient and notify assigned doctor."""
        patient = serializer.save(created_by=self.request.user)
        if patient.assigned_doctor:
            notify(
                user=patient.assigned_doctor,
                title="New patient assigned",
                message=f"Patient {patient.full_name} ({patient.patient_code}) has been assigned to you.",
                level=Notification.LEVEL_INFO,
                entity_type=Notification.ENTITY_PATIENT,
                entity_id=patient.id,
                created_by=self.request.user,
            )

    def perform_update(self, serializer):
        """Update patient and notify new doctor if assignment changed."""
        old_doctor = self.get_object().assigned_doctor
        patient = serializer.save(updated_by=self.request.user)
        new_doctor = patient.assigned_doctor
        # Notify if doctor changed
        if new_doctor and new_doctor != old_doctor:
            notify(
                user=new_doctor,
                title="Patient reassigned to you",
                message=f"Patient {patient.full_name} ({patient.patient_code}) has been reassigned to you.",
                level=Notification.LEVEL_INFO,
                entity_type=Notification.ENTITY_PATIENT,
                entity_id=patient.id,
                created_by=self.request.user,
            )

    # ---------------------------------------------------------
    # SOFT DELETE ONLY (NURSE ONLY)
    # ---------------------------------------------------------
    def destroy(self, request, *args, **kwargs):
        """Soft delete - only nurses can delete patients and its cases """
        patient = self.get_object()

        from apps.cases.models import Case
        related_cases = Case.objects.filter(patient=patient)
        if related_cases.exists():
            deleted_cases_count = 0
            for case in related_cases:
                case.is_deleted = True
                case.deleted_at = timezone.now()
                case.save(update_fields=['is_deleted', 'deleted_at'])
                deleted_cases_count += 1


      
        patient.is_deleted = True
        patient.deleted_by = request.user
        patient.deleted_at = timezone.now()
        



        patient.save()

        return Response(
            {"detail": "Patient soft-deleted successfully."},
            status=status.HTTP_200_OK
        )
    
    # ---------------------------------------------------------
    # LIST PATIENT CASES
    # ---------------------------------------------------------
    @action(detail=True, methods=['get'], url_path='cases')
    def cases(self, request, pk=None):
        """
        List all cases for a specific patient
        
        GET /api/v1/patients/{patient_id}/cases/
        
        Returns all cases linked to this patient with prediction/recommendation status
        """
        patient = self.get_object()
        
        from apps.cases.models import Case
        from apps.cases.serializers import CaseListSerializer
        
        # Get all cases for this patient (exclude soft-deleted)
        cases = Case.objects.filter(
            patient=patient,
            is_deleted=False
        ).order_by('-created_at')
        
        serializer = CaseListSerializer(cases, many=True)
        
        return Response({
            'patient_id': str(patient.id),
            'patient_code': patient.patient_code,
            'patient_name': patient.full_name,
            'total_cases': cases.count(),
            'cases': serializer.data
        })

    # ---------------------------------------------------------
    # LIST DELETED PATIENTS (FOR RESTORE UI)
    # ---------------------------------------------------------
    @action(detail=False, methods=['get'], url_path='deleted')
    def list_deleted(self, request):
        """
        List all soft-deleted patients (for restore functionality)
        
        GET /api/v1/patients/deleted/
        
        Nurses and superadmins can view deleted patients
        """
        user = request.user
        if user.role not in ['nurse', 'superadmin']:
            return Response(
                {'error': 'Only nurses and superadmins can view deleted patients'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        deleted_patients = Patient.objects.deleted()
        serializer = PatientListSerializer(deleted_patients, many=True)
        
        return Response({
            'count': deleted_patients.count(),
            'patients': serializer.data
        })

    # ---------------------------------------------------------
    # RESTORE DELETED PATIENT
    # ---------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """
        Restore a soft-deleted patient (cascade restores related cases)
        
        POST /api/v1/patients/{patient_id}/restore/
        
        Nurses and superadmins can restore patients
        """
        user = request.user
        if user.role not in ['nurse', 'superadmin']:
            return Response(
                {'error': 'Only nurses and superadmins can restore patients'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get from deleted patients
            patient = Patient.objects.deleted().get(pk=pk)
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Deleted patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            patient.restore()  # This cascade restores related cases
            return Response({
                'status': 'restored',
                'patient_code': patient.patient_code,
                'message': f'Patient {patient.full_name} and all related cases restored successfully'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    # ---------------------------------------------------------
    # PERMANENTLY DELETE PATIENT (SUPERADMIN ONLY)
    # ---------------------------------------------------------
    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        """
        Permanently delete a patient and all related data
        
        DELETE /api/v1/patients/{patient_id}/permanent-delete/
        
        Superadmin only - this action cannot be undone!
        Deletes: Patient -> Cases -> Documents -> Predictions -> Recommendations
        """
        user = request.user
        if user.role != 'superadmin':
            return Response(
                {'error': 'Only superadmins can permanently delete patients'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get patient (including deleted ones for hard delete)
            patient = Patient.objects.with_deleted().get(pk=pk)
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        patient_name = patient.full_name
        patient_code = patient.patient_code
        
        try:
            patient.hard_delete()  # This triggers CASCADE delete
            return Response({
                'status': 'deleted',
                'message': f'Patient {patient_name} ({patient_code}) and all related data permanently deleted'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
