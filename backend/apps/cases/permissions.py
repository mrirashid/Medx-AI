from rest_framework import permissions


class IsDoctor(permissions.BasePermission):
    """Only doctors can perform this action."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "doctor"


class IsCaseOwner(permissions.BasePermission):
    """Only the doctor who created the case can access it."""
    
    def has_object_permission(self, request, view, obj):
        # Superadmin has full access
        if request.user.role == "superadmin":
            return True
        
        # Doctor can only access their own cases
        return obj.doctor == request.user