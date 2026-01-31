from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from apps.users.models import User, UserArchive


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "full_name",
        "role",
        "is_active",
        "is_staff",
        "created_at",
    )
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "full_name")
    ordering = ("-created_at",)

    readonly_fields = ("id", "created_at", "updated_at", "last_login")

    # Fields shown in admin detail view
    fieldsets = (
        ("Account Info", {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "role", "phone_number")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Security", {"fields": ("two_factor_enabled",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login")}),
    )

    add_fieldsets = (
        ("Create User", {
            "classes": ("wide",),
            "fields": ("email", "full_name", "role", "password1", "password2"),
        }),
    )


@admin.register(UserArchive)
class UserArchiveAdmin(admin.ModelAdmin):
    """Admin for viewing and restoring archived users"""
    list_display = (
        "email",
        "full_name",
        "role",
        "archived_at",
        "original_id",
    )
    list_filter = ("role", "archived_at")
    search_fields = ("email", "full_name")
    ordering = ("-archived_at",)
    readonly_fields = (
        "id", "original_id", "email", "full_name", "phone_number",
        "role", "is_active", "is_staff", "two_factor_enabled",
        "last_login", "created_at", "updated_at", "archived_at", "archived_by"
    )

    actions = ['restore_users']

    @admin.action(description="Restore selected users")
    def restore_users(self, request, queryset):
        restored = 0
        errors = []
        for archived_user in queryset:
            try:
                archived_user.restore()
                restored += 1
            except Exception as e:
                errors.append(f"{archived_user.email}: {str(e)}")
        
        if restored:
            self.message_user(request, f"Successfully restored {restored} user(s).")
        if errors:
            self.message_user(request, f"Errors: {', '.join(errors)}", level='ERROR')
