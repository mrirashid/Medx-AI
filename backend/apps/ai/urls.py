from django.urls import path
from .views import HER2PredictionViewSet

urlpatterns = [
    # Nested under cases: /api/v1/cases/{case_id}/predictions/
    path(
        'cases/<uuid:case_id>/predictions/predict/',
        HER2PredictionViewSet.as_view({'post': 'predict'}),
        name='case-prediction-predict'
    ),
    path(
        'cases/<uuid:case_id>/predictions/',
        HER2PredictionViewSet.as_view({'get': 'list'}),
        name='case-prediction-list'
    ),
    path(
        'cases/<uuid:case_id>/predictions/<uuid:pk>/',
        HER2PredictionViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}),
        name='prediction-detail'
    ),
    path(
        'predictions/statistics/',
        HER2PredictionViewSet.as_view({'get': 'statistics'}),
        name='prediction-statistics'
    ),
]