import os
from pathlib import Path
from datetime import timedelta
# from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
# load_dotenv(BASE_DIR / ".env")

# Import after .env is loaded
from config.minio import *

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-not-for-prod")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# Media/MinIO settings
USE_MINIO_FOR_MEDIA = os.getenv("USE_MINIO_FOR_MEDIA", "True").lower() in ("true", "1", "yes")
MINIO_MEDIA_BUCKET = os.getenv("MINIO_MEDIA_BUCKET", MINIO_BUCKET)
MINIO_MEDIA_BASE_URL = os.getenv("MINIO_MEDIA_BASE_URL")
MINIO_AUTO_CREATE_BUCKET = os.getenv("MINIO_AUTO_CREATE_BUCKET", "True").lower() in ("true", "1", "yes")

# Supabase settings
# Supabase settings
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "")





# ========= OPENROUTER ==========
# ========= OPENROUTER ==========
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")

OPENROUTER_PDF_MODEL = os.getenv("OPENROUTER_PDF_MODEL", "qwen/qwen2.5-vl-32b-instruct:free")
OPENROUTER_IMAGE_MODEL = os.getenv("OPENROUTER_IMAGE_MODEL", "qwen/qwen2.5-vl-32b-instruct:free")
OPENROUTER_PDF_OCR_ENGINE = os.getenv("OPENROUTER_PDF_OCR_ENGINE", "mistral-ocr")

# ========= GEMINI AI (Legacy) ==========
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ========= GROQ AI ==========
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


CLOUDMERSIVE_API_KEY = os.getenv("CLOUDMERSIVE_API_KEY", "")
CLOUDMERSIVE_SCAN_ENABLED = True   # you can turn it off in development



INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "drf_yasg",
    "corsheaders",
    'rest_framework_simplejwt',
    # local apps
    "apps.common",
    "apps.users",
    "apps.patients",
    "apps.cases",
    "apps.ai",
    "apps.recommendation",
    "apps.documents",
    "apps.activities",
    "apps.dashboard",
    "apps.notifications",
    "silk",


]


# templates and validators 
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    #"silk.middleware.SilkyMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# DB: use sqlite for first run; we’ll switch to Postgres in 2.6
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        "OPTIONS": {
            "timeout": 30,  # Wait up to 30 seconds for locks to clear
        },
    }
}

AUTH_USER_MODEL = "users.User" 

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE":10,
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
    
    # Rate limiting / Throttling (authenticated users only)
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "3000/minute",         
        "predictions": "200/minute",    
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

CORS_ALLOW_ALL_ORIGINS = True  # dev only

# Email Configuration
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@healthcarediagnosis.com")

# Frontend URL for password reset links
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kuala_Lumpur"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media storage
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

if USE_MINIO_FOR_MEDIA:
    DEFAULT_FILE_STORAGE = "config.minio_storage.MinioMediaStorage"
    media_base = MINIO_MEDIA_BASE_URL or f"{'https' if MINIO_USE_SSL else 'http'}://{MINIO_ENDPOINT}"
    MEDIA_URL = f"{media_base.rstrip('/')}/{MINIO_MEDIA_BUCKET}/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

