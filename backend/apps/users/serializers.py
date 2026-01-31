from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.common.serializers import BaseModelSerializer

User = get_user_model()


class UserListSerializer(BaseModelSerializer):
    """basic serializer for listing users"""
    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        )


class UserDetailSerializer(BaseModelSerializer):
    """detailed view (for profile / admin view)"""
    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "role",
            "is_active",
            "last_login",
            "created_at",
            "updated_at",
        )


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration from admin and  (frontend signup)."""
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("full_name", "email", "password", "role")
        extra_kwargs = {
            "role": {"required": True},
           
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """used for updating user info"""
    class Meta:
        model = User
        fields = ("full_name", "email", "phone_number", "role", "is_active")


class UserProfileSerializer(serializers.ModelSerializer):
    """Profile view serializer (includes profile image URL)."""
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "role",
            "is_active",
            "last_login",
            "created_at",
            "updated_at",
            "profile_image_url",
            "two_factor_enabled",
        )

    def get_profile_image_url(self, obj):
        request = self.context.get("request")
        if obj.profile_image:
            url = obj.profile_image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Users update their own name/email/phone and 2FA settings."""
    class Meta:
        model = User
        fields = ("full_name", "email", "phone_number", "two_factor_enabled")

    def validate_email(self, value):
        user = self.context.get("request").user
        if User.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value


class UserProfileImageSerializer(serializers.ModelSerializer):
    """Upload or replace profile image."""
    class Meta:
        model = User
        fields = ("profile_image",)

    def validate_profile_image(self, value):
        if value:
            if value.size > 5 * 1024 * 1024:  # 5 MB limit
                raise serializers.ValidationError("Image file too large (max 5MB).")
            allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
            if hasattr(value, "content_type") and value.content_type not in allowed:
                raise serializers.ValidationError("Only JPEG, PNG, GIF, or WebP images are allowed.")
        return value

    def update(self, instance, validated_data):
        # Delete old profile image if exists
        if instance.profile_image:
            try:
                instance.profile_image.delete(save=False)
            except Exception:
                pass  # Ignore if file doesn't exist
        return super().update(instance, validated_data)


class UserChangePasswordSerializer(serializers.Serializer):
    """Change password when authenticated."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        user = self.context.get("request").user
        if not user.check_password(attrs.get("old_password")):
            raise serializers.ValidationError({"old_password": "Old password is incorrect."})
        if attrs.get("new_password") != attrs.get("new_password_confirm"):
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs

    def save(self, **kwargs):
        user = self.context.get("request").user
        user.set_password(self.validated_data.get("new_password"))
        user.save(update_fields=["password"])
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    """Request password reset via email."""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Verify that the email exists in the system."""
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email address.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Confirm password reset using token."""
    email = serializers.EmailField(required=True)
    token = serializers.CharField(required=True, max_length=255)
    new_password = serializers.CharField(write_only=True, required=True, min_length=6)
    new_password_confirm = serializers.CharField(write_only=True, required=True, min_length=6)

    def validate(self, data):
        """Validate token and password match."""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})

        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found."})

        if not user.verify_reset_token(data['token']):
            raise serializers.ValidationError({"token": "Invalid or expired reset token."})

        data['user'] = user
        return data

    def create(self, validated_data):
        """Reset the password and clear the token."""
        user = validated_data['user']
        user.set_password(validated_data['new_password'])
        user.clear_reset_token()
        return user
