from rest_framework import viewsets, status,generics
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import TokenAuthentication
from apps.users.permission import IsSuperAdmin, IsSelfOrSuperAdmin

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.users.serializers import (
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserProfileImageSerializer,
    UserChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)
from apps.users.services import (
    send_password_reset_email, 
    send_password_reset_confirmation_email,
    generate_2fa_code,
    send_2fa_code_email,
    store_2fa_code,
    verify_2fa_code,
    clear_2fa_code,
)
from apps.activities.mixins import ActivityLoggingMixin
from apps.activities.models import Activity
from apps.notifications.services import notify
from apps.notifications.models import Notification

User = get_user_model()


class UserViewSet(ActivityLoggingMixin, viewsets.ModelViewSet):
    """
    User Management:
    - Superadmin: full CRUD
    - Users (doctor/nurse): can only view/update their own profile
    """
    # permission_classes = [IsAuthenticated]

    queryset = User.objects.all().order_by("-created_at")
    
    # Activity logging configuration
    activity_entity_type = Activity.ENTITY_USER
    
    def get_activity_details(self, instance):
        """Customize what gets logged for users"""
        return {
            'email': instance.email,
            'role': instance.role,
            'full_name': instance.full_name,
            'entity_name': f'{instance.role} {instance.email}'
        }

    def get_permissions(self):

        # Public access (no authentication required)
        if self.action in ["forgot_password", "reset_password", "send_2fa_code", "verify_2fa_code", "check_2fa_enabled"]:
            return [AllowAny()]

        # Self-only access (doctor/nurse can view/update themselves)
        if self.action in ["retrieve", "update", "partial_update"]:
            return [IsAuthenticated(), IsSelfOrSuperAdmin()]

        # Superadmin-only actions
        if self.action in ["list", "create", "destroy", "archived", "restore_archived", "delete_archived"]:
            return [IsAuthenticated(), IsSuperAdmin()]

        # Fallback
        return [IsAuthenticated()]


    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        elif self.action == "retrieve":
            return UserDetailSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        elif self.action == "create":
            return UserCreateSerializer
        return UserDetailSerializer

    def perform_create(self, serializer):
        """Create user and notify superadmins."""
        user = serializer.save()
        # Notify all superadmins about new user
        superadmins = User.objects.filter(role="superadmin", is_active=True)
        for admin in superadmins:
            notify(
                user=admin,
                title="New user created",
                message=f"{user.role.title()} {user.full_name} ({user.email}) has been created.",
                level=Notification.LEVEL_INFO,
                entity_type=Notification.ENTITY_USER,
                entity_id=user.id,
                created_by=self.request.user,
            )


    def get_queryset(self):
        """Superadmin listing with search/filter support."""
        qs = super().get_queryset()

        # Filter by role: ?role=doctor|nurse|superadmin
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        # Filter by status: ?status=active|inactive
        status_param = self.request.query_params.get("status")
        if status_param:
            if status_param.lower() == "active":
                qs = qs.filter(is_active=True)
            elif status_param.lower() == "inactive":
                qs = qs.filter(is_active=False)

        # Search by name or email: ?search=term
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )

        return qs.order_by("-created_at")
    

    def destroy(self, request, *args, **kwargs):
        """Archive delete - moves user to UserArchive table (superadmin only)."""
        user = self.get_object()
        user.delete()  # User.delete() moves to UserArchive and deletes from main table
        return Response({"detail": "User archived successfully."})

    @action(detail=False, methods=["get"], url_path="archived", permission_classes=[IsAuthenticated, IsSuperAdmin])
    def archived(self, request):
        """
        GET /api/v1/users/archived/
        
        List all archived (deleted) users. Superadmin only.
        """
        from apps.users.models import UserArchive
        
        archived_users = UserArchive.objects.all().order_by('-archived_at')
        
        data = [
            {
                'id': str(user.id),
                'original_id': str(user.original_id),
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'archived_at': user.archived_at,
                'created_at': user.created_at,
            }
            for user in archived_users
        ]
        
        return Response({
            'count': len(data),
            'results': data
        })

    @action(detail=True, methods=["post"], url_path="restore", permission_classes=[IsAuthenticated, IsSuperAdmin])
    def restore_archived(self, request, pk=None):
        """
        POST /api/v1/users/{archive_id}/restore/
        
        Restore an archived user back to active users. Superadmin only.
        """
        from apps.users.models import UserArchive
        from apps.common.exceptions import RestoreConflictError
        
        try:
            archived_user = UserArchive.objects.get(pk=pk)
        except UserArchive.DoesNotExist:
            return Response(
                {'error': 'Archived user not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            restored_user = archived_user.restore()
            return Response({
                'status': 'restored',
                'id': str(restored_user.id),
                'email': restored_user.email,
                'message': f'User {restored_user.full_name} restored successfully'
            })
        except RestoreConflictError as e:
            return Response(
                {'error': str(e), 'conflict_fields': e.conflict_fields},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["delete"], url_path="permanent-delete", permission_classes=[IsAuthenticated, IsSuperAdmin])
    def delete_archived(self, request, pk=None):
        """
        DELETE /api/v1/users/{archive_id}/permanent-delete/
        
        Permanently delete an archived user. Superadmin only.
        This action cannot be undone.
        """
        from apps.users.models import UserArchive
        
        try:
            archived_user = UserArchive.objects.get(pk=pk)
        except UserArchive.DoesNotExist:
            return Response(
                {'error': 'Archived user not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        email = archived_user.email
        full_name = archived_user.full_name
        archived_user.delete()
        
        return Response({
            'status': 'deleted',
            'message': f'User {full_name} ({email}) permanently deleted'
        })

    @action(
        detail=False, 
        methods=["post"], 
        url_path="forgot-password", 
        permission_classes=[AllowAny],
        authentication_classes=[]
    )
    def forgot_password(self, request):
        """
        POST /api/v1/users/forgot-password/
        
        Request password reset via email.
        No authentication required.
        """
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.get(email=email)

        # Generate reset token
        reset_token = user.generate_reset_token(expires_in_hours=24)

        # Send email
        email_sent = send_password_reset_email(user, reset_token)

        if email_sent:
            return Response(
                {"detail": "Password reset email sent. Please check your email."},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"detail": "Failed to send email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=False, 
        methods=["post"], 
        url_path="reset-password", 
        permission_classes=[AllowAny],
        authentication_classes=[]
    )
    def reset_password(self, request):
        """
        POST /api/v1/users/reset-password/
        
        Reset password using token from email.
        No authentication required.
        
        Body:
        {
            "email": "user@example.com",
            "token": "reset_token_from_email",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123"
        }
        """
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # The create method in serializer handles password reset
        user = serializer.save()

        # Send confirmation email
        send_password_reset_confirmation_email(user)

        return Response(
            {"detail": "Password has been reset successfully. You can now log in with your new password."},
            status=status.HTTP_200_OK
        )

    @action(
        detail=False, 
        methods=["get"], 
        url_path="doctors",
        permission_classes=[IsAuthenticated]
    )
    def get_doctors(self, request):
        """
        GET /api/v1/users/doctors/
        
        Returns list of all active doctors with minimal info.
        Used by Nurses when creating/assigning patients to doctors.
        
        Accessible to: Nurse, Doctor, SuperAdmin (anyone authenticated)
        
        Response:
        [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "full_name": "Ahmed Hassan",
                "email": "ahmed@hospital.com"
            },
            ...
        ]
        """
        doctors = User.objects.filter(
            role='doctor', 
            is_active=True
        ).values('id', 'full_name', 'email').order_by('created_at')
        
        return Response(doctors)

    @action(detail=False, methods=["get"], url_path="profile", permission_classes=[IsAuthenticated])
    def profile(self, request):
        """Get current user's profile."""
        serializer = UserProfileSerializer(request.user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch"], url_path="profile/update", permission_classes=[IsAuthenticated])
    def profile_update(self, request):
        """Update current user's name/email/phone."""
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Profile updated successfully.", "user": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="profile/upload-image", permission_classes=[IsAuthenticated])
    def profile_upload_image(self, request):
        """Upload or replace profile image. Accepts multipart/form-data with profile_image."""
        serializer = UserProfileImageSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile = UserProfileSerializer(request.user, context={"request": request})
        return Response({"detail": "Profile image uploaded successfully.", "user": profile.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="profile/change-password", permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Change password for current user."""
        serializer = UserChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Notify user about password change
        notify(
            user=request.user,
            title="Password changed",
            message="Your password has been changed successfully.",
            level=Notification.LEVEL_SUCCESS,
            entity_type=Notification.ENTITY_USER,
            entity_id=request.user.id,
        )
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)

    @action(
        detail=False, 
        methods=["post"], 
        url_path="2fa/send-code", 
        permission_classes=[AllowAny],
        authentication_classes=[]
    )
    def send_2fa_code(self, request):
        """
        POST /api/v1/users/2fa/send-code/
        
        Send 2FA verification code to user's email.
        No authentication required (called during login flow).
        
        Body:
        {
            "email": "user@example.com"
        }
        """
        email = request.data.get('email')
        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate and store the code
        code = generate_2fa_code()
        store_2fa_code(email, code)
        
        # Send the code via email
        email_sent = send_2fa_code_email(user, code)
        
        if email_sent:
            return Response(
                {"detail": "Verification code sent to your email."},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"detail": "Failed to send verification code. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(
        detail=False, 
        methods=["post"], 
        url_path="2fa/verify-code", 
        permission_classes=[AllowAny],
        authentication_classes=[]
    )
    def verify_2fa_code(self, request):
        """
        POST /api/v1/users/2fa/verify-code/
        
        Verify the 2FA code entered by the user.
        No authentication required (called during login flow).
        
        Body:
        {
            "email": "user@example.com",
            "code": "123456"
        }
        """
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response(
                {"detail": "Email and code are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify the code
        is_valid = verify_2fa_code(email, code)
        
        if is_valid:
            return Response(
                {"detail": "Code verified successfully.", "verified": True},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"detail": "Invalid or expired verification code.", "verified": False},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(
        detail=False, 
        methods=["post"], 
        url_path="2fa/check-enabled", 
        permission_classes=[AllowAny],
        authentication_classes=[]
    )
    def check_2fa_enabled(self, request):
        """
        POST /api/v1/users/2fa/check-enabled/
        
        Check if 2FA is enabled for a user by email.
        No authentication required (called during login flow).
        
        Body:
        {
            "email": "user@example.com"
        }
        """
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            return Response(
                {"two_factor_enabled": user.two_factor_enabled},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            # Don't reveal if user exists or not for security
            return Response(
                {"two_factor_enabled": False},
                status=status.HTTP_200_OK
            )
