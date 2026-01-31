# apps/cases/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.cases.models import Case
from apps.patients.models import Patient
from apps.ai.models import HER2Prediction

User = get_user_model()


class CaseListSerializer(serializers.ModelSerializer):
    """Used in the patient Case History table."""

    patient_code = serializers.CharField(
        source="patient.patient_code", read_only=True
    )
    patient_name = serializers.CharField(
        source="patient.full_name", read_only=True
    )
    doctor_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    risk_level = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            "id",
            "case_code",
            "patient_code",
            "patient_name",
            "doctor_name",
            "risk_level",
            "has_prediction",
            "has_recommendation",
            "status",
            "created_at",
        ]
    
    def get_risk_level(self, obj):
        """Get risk level from case or latest prediction"""
        if obj.risk_level:
            return obj.risk_level
        # Fallback to latest prediction
        latest_pred = HER2Prediction.objects.filter(
            case=obj,
            is_deleted=False
        ).order_by('-created_at').first()
        return latest_pred.risk_level if latest_pred else None


class CaseDetailSerializer(serializers.ModelSerializer):
    """Used for detailed case view."""

    patient_code = serializers.CharField(
        source="patient.patient_code", read_only=True
    )
    patient_name = serializers.CharField(
        source="patient.full_name", read_only=True
    )
    doctor_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )

    class Meta:
        model = Case
        fields = [
            "id",
            "case_code",
            "patient",
            "patient_code",
            "patient_name",
            "doctor_name",
            "has_prediction",
            "has_recommendation",
            "risk_level",
            "status",
            "notes",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = [
            "case_code",
            "has_prediction",
            "has_recommendation",
            "created_at",
            "updated_at",
            "created_by",
        ]


class CaseCreateSerializer(serializers.ModelSerializer):
    """Used when doctor creates a new case."""

    # Read-only fields for response
    patient_code = serializers.CharField(
        source="patient.patient_code", read_only=True
    )
    patient_name = serializers.CharField(
        source="patient.full_name", read_only=True
    )
    doctor_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )

    class Meta:
        model = Case
        fields = [
            "id",
            "case_code",
            "patient",
            "patient_code",
            "patient_name",
            "doctor_name",
            "status",
            "notes",
            "has_prediction",
            "has_recommendation",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "case_code",
            "patient_code",
            "patient_name",
            "doctor_name",
            "has_prediction",
            "has_recommendation",
            "created_at",
        ]

    def validate_patient(self, value):
        """Ensure doctor can only create cases for assigned patients."""
        user = self.context["request"].user


        # Doctor can only create cases for assigned patients
        if user.role == "doctor":
            if value.assigned_doctor != user:
                raise serializers.ValidationError(
                    "You can only create cases for patients assigned to you."
                )

        return value

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        return Case.objects.create(**validated_data)


class CaseUpdateSerializer(serializers.ModelSerializer):
    """Used when updating case details."""

    class Meta:
        model = Case
        fields = ["status", "notes", "risk_level"]

    def update(self, instance, validated_data):
        # Auto-set updated_by (if you have this field in BaseModel)
        # validated_data["updated_by"] = self.context["request"].user
        return super().update(instance, validated_data)
