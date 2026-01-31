from rest_framework.routers import DefaultRouter
from apps.users.views import UserViewSet
from django.urls import path

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")



urlpatterns =  router.urls   
