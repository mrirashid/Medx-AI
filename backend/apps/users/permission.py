from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsSuperAdmin(BasePermission):
    """Only superadmin can access full user management."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated 
            and request.user.role == "superadmin"
        )


class IsSelfOrSuperAdmin(BasePermission):
    """
    Allow users to read/update ONLY their own profile.
    Superadmin can do everything.
    """

    def has_object_permission(self, request, view, obj):
        # PATCH/PUT/GET on /users/<id>/
        return (
            request.user.role == "superadmin"
            or obj.id == request.user.id
        )
