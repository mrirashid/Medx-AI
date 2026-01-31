from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Patient
from datetime import date

User = get_user_model()

class PatientListSerializer(serializers.ModelSerializer):
    """Used for listing patients in tables or dropdowns."""

    assigned_doctor_name = serializers.CharField(
        source="assigned_doctor.full_name", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    age = serializers.SerializerMethodField()
    total_cases = serializers.SerializerMethodField()
    last_case_date = serializers.SerializerMethodField()

    def get_age(self, obj):
        """Calculate age from date of birth."""
        if obj.dob:
            today = date.today()
            return today.year - obj.dob.year - ((today.month, today.day) < (obj.dob.month, obj.dob.day))
        return None

    def get_total_cases(self, obj):
        """Count total cases for this patient (excluding soft-deleted)."""
        return obj.cases.filter(is_deleted=False).count()

    def get_last_case_date(self, obj):
        """Get the most recent case creation date."""
        last_case = obj.cases.filter(is_deleted=False).order_by('-created_at').first()
        return last_case.created_at if last_case else None

    class Meta:
        model = Patient
        fields = [
            "id",
            "patient_code",
            "full_name",
            "identity_number",
            "gender",
            "dob",
            "age",
            "phone_number",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_relation",
            "emergency_contact_phone",
            "medical_history",
            "allergies",
            "current_medications",
            "total_cases",
            "last_case_date",
            "assigned_doctor",
            "assigned_doctor_name",
            "created_by_name",
            "created_at",
            "updated_at",
        ]


class PatientDetailSerializer(serializers.ModelSerializer):
    """Used for detailed view / patient profile page."""

    assigned_doctor_name = serializers.CharField(
        source="assigned_doctor.full_name", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )

    class Meta:
        model = Patient
        fields = "__all__"  # show all columns for detail view
        read_only_fields = ["patient_code", "created_at", "updated_at", 'created_by']


class PatientCreateSerializer(serializers.ModelSerializer):
    """Used when nurse registers a new patient."""

    assigned_doctor_name = serializers.CharField(
        source="assigned_doctor.full_name", read_only=True
    )

    class Meta:
        model = Patient
        fields = [
            "full_name",
            "identity_number",     # IC/Passport required
            "dob",
            "gender",
            "phone_number",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_relation",
            "emergency_contact_phone",
            "medical_history",
            "allergies",
            "current_medications",
            "assigned_doctor",      # send the doctor ID here
            "assigned_doctor_name", # returned in response
        ]

    def validate_identity_number(self, value):
        """Check if identity number already exists."""
        # Check for active patients
        if Patient.objects.filter(identity_number=value, is_deleted=False).exists():
            raise serializers.ValidationError(
                "A patient with this IC/Passport Number already exists in the system."
            )
        
        # Check for soft-deleted patients
        if Patient._base_manager.filter(identity_number=value, is_deleted=True).exists():
            raise serializers.ValidationError(
                "A patient with this IC/Passport Number was previously deleted. "
                "Please contact an administrator to restore this patient or use a different IC/Passport Number."
            )
        
        return value

    def create(self, validated_data):
        user = self.context["request"].user  # nurse creating
        validated_data["created_by"] = user
        return Patient.objects.create(**validated_data)

class PatientUpdateSerializer(serializers.ModelSerializer):
    # client sends this UUID to change doctor
    assigned_doctor = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="doctor"),
        required=False, allow_null=True  # allow unassign if you want
    )
    # we return the doctor's name for UI display
    assigned_doctor_name = serializers.CharField(
        source="assigned_doctor.full_name",
        read_only=True
    )

    class Meta:
        model = Patient
        fields = [
            "full_name",
            "identity_number",
            "dob",
            "gender",
            "phone_number",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_relation",
            "emergency_contact_phone",
            "medical_history",
            "allergies",
            "updated_at",
            "current_medications",
            "assigned_doctor",       # writable (UUID)
            "assigned_doctor_name",  # read-only (string)
        ]

    def validate_identity_number(self, value):
        """Check if identity number already exists (excluding current patient)."""
        # Exclude current patient when updating
        queryset = Patient.objects.filter(identity_number=value, is_deleted=False)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "A patient with this IC/Passport Number already exists in the system."
            )
        
        # Check for soft-deleted patients (only when creating or changing IC)
        if not self.instance or self.instance.identity_number != value:
            if Patient._base_manager.filter(identity_number=value, is_deleted=True).exists():
                raise serializers.ValidationError(
                    "A patient with this IC/Passport Number was previously deleted. "
                    "Please contact an administrator to restore this patient or use a different IC/Passport Number."
                )
        
        return value

    def validate_assigned_doctor(self, value):
        # Redundant safety check (queryset already filters), but nice for clarity.
        if value and value.role != "doctor":
            raise serializers.ValidationError("Assigned user must have role=doctor.")
        return value
    
    def update(self, instance, validated_data):
        # Set updated_by (removed role check - handled at view level)
        validated_data["updated_by"] = self.context["request"].user
        return super().update(instance, validated_data)