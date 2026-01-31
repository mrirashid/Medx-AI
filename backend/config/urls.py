"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from config.auth import CurrentUserView, LogoutView

schema_view = get_schema_view(
    openapi.Info(
        title="Healthcare Diagnosis System API",
        default_version="v1",
        description="API documentation for the HDS project",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # Versioned API Routes
    path("api/v1/", include("apps.common.urls")),
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.patients.urls")), 
    path("api/v1/", include("apps.cases.urls")),
    path("api/v1/", include("apps.documents.urls")),
    path('api/v1/', include('apps.ai.urls')),
    path('api/v1/', include('apps.recommendation.urls')),
    path('api/v1/', include('apps.activities.urls')),
    path('api/v1/', include('apps.dashboard.urls')),
    path('api/v1/', include('apps.notifications.urls')),

    # Global Auth Routes
    path("api/login/", TokenObtainPairView.as_view(), name="jwt-login"),
    path("api/login/refresh/", TokenRefreshView.as_view(), name="jwt-refresh"),
    path("api/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/logout/", LogoutView.as_view(), name="logout"),

    #silk profiling urls
    path('silk/', include('silk.urls', namespace='silk')),

    # Swagger Docs
    path("api/docs/", schema_view.with_ui("swagger", cache_timeout=0), name="swagger-ui"),
]
