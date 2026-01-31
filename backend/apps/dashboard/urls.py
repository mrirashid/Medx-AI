from django.urls import path
from .views import SuperadminDashboardView, DoctorDashboardView, NurseDashboardView

urlpatterns = [
    path('dashboard/superadmin/', SuperadminDashboardView.as_view(), name='dashboard-superadmin'),
    path('dashboard/doctor/', DoctorDashboardView.as_view(), name='dashboard-doctor'),
    path('dashboard/nurse/', NurseDashboardView.as_view(), name='dashboard-nurse'),
]
