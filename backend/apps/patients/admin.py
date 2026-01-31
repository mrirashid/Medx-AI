from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from apps.patients.models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    """
    Patient admin with role-based access:
    - Superadmin: full access
    - Nurse: create/edit all patients
    - Doctor: read-only for assigned patients
    """
    
    list_display = [
        "patient_code",
        "full_name",
        "gender",
        "phone_number",
        "assigned_doctor",
        "created_by",
        "created_at",
    ]
    
    list_filter = ["gender", "is_deleted", "assigned_doctor", "created_at"]
    search_fields = ["patient_code", "full_name", "phone_number", "email"]
    
    readonly_fields = [
        "id",
        "patient_code",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "deleted_at",
      
    ]
    
    fieldsets = (
        ("Patient Info", {
            "fields": ("id", "patient_code", "full_name", "dob", "gender")
        }),
        ("Contact", {
            "fields": ("phone_number", "email", "address")
        }),
        ("Emergency Contact", {
            "fields": (
                "emergency_contact_name",
                "emergency_contact_relation",
                "emergency_contact_phone"
            )
        }),
        ("Medical", {
            "fields": ("medical_history", "allergies", "current_medications")
        }),
        ("Assignment", {
            "fields": ("assigned_doctor",)
        }),
        ("Audit", {
            "fields": (
                "created_at", "created_by", "updated_at", "updated_by",
                "is_deleted", "deleted_at"
            ),
            "classes": ("collapse",)
        }),
    )
    
    # Role-based queryset
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        user = request.user
        
        if user.role == "superadmin":
            return qs  # All patients
        
        if user.role == "nurse":
            return qs.filter(is_deleted=False)  # All active patients
        
        if user.role == "doctor":
            return qs.filter(assigned_doctor=user, is_deleted=False)  # Assigned only
        
        return qs.none()
    
    # Role-based permissions
    def has_add_permission(self, request):
        return request.user.role in ["nurse", "superadmin"]
    
    def has_change_permission(self, request, obj=None):
        return request.user.role in ["nurse", "superadmin"]
    
    def has_delete_permission(self, request, obj=None):
        return request.user.role in ["nurse", "superadmin"]
    
    # Auto-set audit fields
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        else:
            obj.updated_by = request.user
        super().save_model(request, obj, form, change)
    
    # Limit assigned_doctor to doctors only
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "assigned_doctor":
            from django.contrib.auth import get_user_model
            User = get_user_model()
            kwargs["queryset"] = User.objects.filter(role="doctor")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
