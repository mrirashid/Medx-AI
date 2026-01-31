"""
Email service for user-related operations.
"""
import random
import string
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.cache import cache


def generate_2fa_code():
    """Generate a 6-digit verification code."""
    return ''.join(random.choices(string.digits, k=6))


def send_2fa_code_email(user, code):
    """
    Send 2FA verification code to user's email.
    
    Args:
        user: User instance
        code: 6-digit verification code
    """
    subject = 'Your Login Verification Code'

    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #3498db;">Login Verification Code</h2>
                <p>Hi {user.full_name},</p>
                <p>Your two-factor authentication code is:</p>
                
                <div style="background-color: #f8f9fa; border: 2px dashed #3498db; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2c3e50;">
                        {code}
                    </span>
                </div>
                
                <p style="color: #e74c3c; font-weight: bold;">
                     This code will expire in 10 minutes.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <p style="color: #95a5a6; font-size: 12px;">
                    If you didn't attempt to log in, please ignore this email or contact support 
                    if you suspect unauthorized access to your account.
                </p>
                
                <p style="color: #95a5a6; font-size: 12px;">
                    Best regards,<br>
                    Healthcare Diagnosis System Team
                </p>
            </div>
        </body>
    </html>
    """

    plain_message = f"""
    Login Verification Code
    
    Hi {user.full_name},
    
    Your two-factor authentication code is: {code}
    
    This code will expire in 10 minutes.
    
    If you didn't attempt to log in, please ignore this email or contact support.
    
    Best regards,
    Healthcare Diagnosis System Team
    """

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending 2FA code email to {user.email}: {str(e)}")
        return False


def store_2fa_code(user_email, code, expiry_seconds=600):
    """
    Store 2FA code in cache with expiry.
    
    Args:
        user_email: User's email address
        code: 6-digit verification code
        expiry_seconds: Time in seconds before code expires (default 10 minutes)
    """
    cache_key = f"2fa_code_{user_email}"
    cache.set(cache_key, code, expiry_seconds)


def verify_2fa_code(user_email, code):
    """
    Verify the 2FA code for a user.
    
    Args:
        user_email: User's email address
        code: Code entered by user
    
    Returns:
        bool: True if code matches, False otherwise
    """
    cache_key = f"2fa_code_{user_email}"
    stored_code = cache.get(cache_key)
    
    if stored_code and stored_code == code:
        # Delete the code after successful verification
        cache.delete(cache_key)
        return True
    return False


def clear_2fa_code(user_email):
    """Clear the 2FA code for a user."""
    cache_key = f"2fa_code_{user_email}"
    cache.delete(cache_key)


def send_password_reset_email(user, reset_token):
    """
    Send password reset email to user.
    
    Args:
        user: User instance
        reset_token: Generated reset token
    """
    # Build reset URL (frontend URL)
    # Adjust the URL based on your frontend URL
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
    reset_url = f"{frontend_url}/reset-password?email={user.email}&token={reset_token}"

    # Email subject
    subject = 'Password Reset Request'

    # HTML context
    context = {
        'user_name': user.full_name,
        'reset_url': reset_url,
        'reset_token': reset_token,
        'email': user.email,
    }

    # Build email body (HTML)
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #2c3e50;">Password Reset Request</h2>
                <p>Hi {user.full_name},</p>
                <p>We received a request to reset your password. Click the link below to proceed:</p>
                
                <p style="margin: 20px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                
                <p style="color: #7f8c8d; font-size: 14px;">
                    Or copy and paste this link in your browser:<br>
                    <code style="background-color: #f5f5f5; padding: 5px 10px; border-radius: 3px; word-break: break-all;">
                        {reset_url}
                    </code>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <p style="color: #95a5a6; font-size: 12px;">
                    This reset link will expire in 24 hours. If you didn't request a password reset, 
                    please ignore this email or contact support.
                </p>
                
                <p style="color: #95a5a6; font-size: 12px;">
                    Best regards,<br>
                    Healthcare Diagnosis System Team
                </p>
            </div>
        </body>
    </html>
    """

    # Plain text fallback
    plain_message = f"""
    Password Reset Request
    
    Hi {user.full_name},
    
    We received a request to reset your password. Click the link below to proceed:
    
    {reset_url}
    
    This reset link will expire in 24 hours. If you didn't request a password reset, 
    please ignore this email or contact support.
    
    Best regards,
    Healthcare Diagnosis System Team
    """

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending password reset email to {user.email}: {str(e)}")
        return False


def send_password_reset_confirmation_email(user):
    """
    Send confirmation email after successful password reset.
    
    Args:
        user: User instance
    """
    subject = 'Password Reset Successful'

    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #27ae60;">Password Reset Successful</h2>
                <p>Hi {user.full_name},</p>
                <p>Your password has been successfully reset. You can now log in with your new password.</p>
                
                <p style="margin: 20px 0;">
                    <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')}" 
                       style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Go to Login
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <p style="color: #95a5a6; font-size: 12px;">
                    If you didn't perform this action, please contact support immediately.
                </p>
                
                <p style="color: #95a5a6; font-size: 12px;">
                    Best regards,<br>
                    Healthcare Diagnosis System Team
                </p>
            </div>
        </body>
    </html>
    """

    plain_message = f"""
    Password Reset Successful
    
    Hi {user.full_name},
    
    Your password has been successfully reset. You can now log in with your new password.
    
    If you didn't perform this action, please contact support immediately.
    
    Best regards,
    Healthcare Diagnosis System Team
    """

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending confirmation email to {user.email}: {str(e)}")
        return False
