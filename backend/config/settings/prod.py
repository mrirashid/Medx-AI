"""
Production settings
Used for deployed environments.
"""
from .base import *
from config.supabase_client import *


load_dotenv(BASE_DIR / ".env.prod")

DEBUG = False
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "yourdomain.com").split(",")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "your_db_name"),
        "USER": os.getenv("POSTGRES_USER", "your_db_user"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "your_db_password"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}