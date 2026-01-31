"""
Tests for password reset functionality.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class ForgotPasswordTests(APITestCase):
    """Tests for forgot password endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            full_name="Test User",
            password="OldPassword123",
            role="doctor"
        )
        self.forgot_password_url = reverse("user-forgot-password")

    def test_forgot_password_valid_email(self):
        """Test requesting password reset with valid email."""
        data = {"email": "testuser@example.com"}
        response = self.client.post(self.forgot_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("email sent", response.data["detail"].lower())

        # Verify token was generated
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.reset_token)
        self.assertIsNotNone(self.user.reset_token_expires)

    def test_forgot_password_invalid_email(self):
        """Test requesting password reset with non-existent email."""
        data = {"email": "nonexistent@example.com"}
        response = self.client.post(self.forgot_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not found", response.data["email"][0].lower())

    def test_forgot_password_missing_email(self):
        """Test requesting password reset without email."""
        data = {}
        response = self.client.post(self.forgot_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_multiple_reset_requests_overwrite_token(self):
        """Test that multiple reset requests generate new tokens."""
        # First request
        self.client.post(self.forgot_password_url, {"email": "testuser@example.com"}, format="json")
        self.user.refresh_from_db()
        first_token = self.user.reset_token

        # Second request
        self.client.post(self.forgot_password_url, {"email": "testuser@example.com"}, format="json")
        self.user.refresh_from_db()
        second_token = self.user.reset_token

        # Tokens should be different
        self.assertNotEqual(first_token, second_token)


class ResetPasswordTests(APITestCase):
    """Tests for reset password endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            full_name="Test User",
            password="OldPassword123",
            role="doctor"
        )
        self.reset_password_url = reverse("user-reset-password")

        # Generate a valid token for testing
        self.valid_token = self.user.generate_reset_token(expires_in_hours=24)

    def test_reset_password_valid_token(self):
        """Test password reset with valid token."""
        data = {
            "email": "testuser@example.com",
            "token": self.valid_token,
            "new_password": "NewPassword123",
            "new_password_confirm": "NewPassword123"
        }
        response = self.client.post(self.reset_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("successfully", response.data["detail"].lower())

        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassword123"))

        # Verify token was cleared
        self.assertIsNone(self.user.reset_token)
        self.assertIsNone(self.user.reset_token_expires)

    def test_reset_password_invalid_token(self):
        """Test password reset with invalid token."""
        data = {
            "email": "testuser@example.com",
            "token": "invalid_token_12345",
            "new_password": "NewPassword123",
            "new_password_confirm": "NewPassword123"
        }
        response = self.client.post(self.reset_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid", response.data["token"][0].lower())

    def test_reset_password_expired_token(self):
        """Test password reset with expired token."""
        # Create an expired token
        self.user.reset_token = "some_token_12345"
        self.user.reset_token_expires = timezone.now() - timedelta(hours=1)
        self.user.save()

        data = {
            "email": "testuser@example.com",
            "token": "some_token_12345",
            "new_password": "NewPassword123",
            "new_password_confirm": "NewPassword123"
        }
        response = self.client.post(self.reset_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data["token"][0].lower())

    def test_reset_password_mismatch(self):
        """Test password reset with mismatched passwords."""
        data = {
            "email": "testuser@example.com",
            "token": self.valid_token,
            "new_password": "NewPassword123",
            "new_password_confirm": "DifferentPassword123"
        }
        response = self.client.post(self.reset_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("do not match", response.data["new_password"][0].lower())

    def test_reset_password_short_password(self):
        """Test password reset with too short password."""
        data = {
            "email": "testuser@example.com",
            "token": self.valid_token,
            "new_password": "short",
            "new_password_confirm": "short"
        }
        response = self.client.post(self.reset_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_wrong_email(self):
        """Test password reset with wrong email."""
        data = {
            "email": "wrongemail@example.com",
            "token": self.valid_token,
            "new_password": "NewPassword123",
            "new_password_confirm": "NewPassword123"
        }
        response = self.client.post(self.reset_password_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not found", response.data["email"][0].lower())


class UserPasswordResetMethodsTests(TestCase):
    """Tests for User model password reset methods."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            full_name="Test User",
            password="Password123",
            role="doctor"
        )

    def test_generate_reset_token(self):
        """Test token generation."""
        token = self.user.generate_reset_token(expires_in_hours=24)

        self.assertIsNotNone(token)
        self.assertEqual(self.user.reset_token, token)
        self.assertIsNotNone(self.user.reset_token_expires)

    def test_verify_reset_token_valid(self):
        """Test verifying a valid token."""
        token = self.user.generate_reset_token(expires_in_hours=24)
        is_valid = self.user.verify_reset_token(token)

        self.assertTrue(is_valid)

    def test_verify_reset_token_invalid(self):
        """Test verifying an invalid token."""
        self.user.generate_reset_token(expires_in_hours=24)
        is_valid = self.user.verify_reset_token("invalid_token")

        self.assertFalse(is_valid)

    def test_verify_reset_token_expired(self):
        """Test verifying an expired token."""
        token = self.user.generate_reset_token(expires_in_hours=24)
        # Set expiration to the past
        self.user.reset_token_expires = timezone.now() - timedelta(hours=1)
        self.user.save()

        is_valid = self.user.verify_reset_token(token)

        self.assertFalse(is_valid)

    def test_clear_reset_token(self):
        """Test clearing reset token."""
        self.user.generate_reset_token(expires_in_hours=24)
        self.assertIsNotNone(self.user.reset_token)

        self.user.clear_reset_token()

        self.assertIsNone(self.user.reset_token)
        self.assertIsNone(self.user.reset_token_expires)
