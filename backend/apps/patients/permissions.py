from rest_framework import permissions


class IsNurse(permissions.BasePermission):
    """Only nurses can perform this action."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "nurse"


class IsDoctor(permissions.BasePermission):
    """Only doctors can perform this action."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "doctor"


class IsSuperAdmin(permissions.BasePermission):
    """Only superadmin can perform this action."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "superadmin"
