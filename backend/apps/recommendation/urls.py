from django.urls import path
from .views import RecommendationViewSet

urlpatterns = [
    # Get all pending recommendations for the logged-in doctor
    path(
        'recommendations/pending/',
        RecommendationViewSet.as_view({'get': 'pending'}),
        name='recommendations-pending'
    ),
    
    # Generate recommendation (nested under cases)
    path(
        'cases/<uuid:case_id>/recommendations/generate/',
        RecommendationViewSet.as_view({'post': 'generate'}),
        name='recommendation-generate'
    ),
    
    # List recommendations for a case
    path(
        'cases/<uuid:case_id>/recommendations/',
        RecommendationViewSet.as_view({'get': 'list'}),
        name='case-recommendation-list'
    ),
    
    # Get specific recommendation
    path(
        'cases/<uuid:case_id>/recommendations/<uuid:pk>/',
        RecommendationViewSet.as_view({'get': 'retrieve'}),
        name='recommendation-detail'
    ),
    
    # Update status with parameter (RECOMMENDED)
    path(
        'cases/<uuid:case_id>/recommendations/<uuid:pk>/update-status/',
        RecommendationViewSet.as_view({'patch': 'update_status'}),
        name='recommendation-update-status'
    ),
    
    # Hard delete recommendation
    path(
        'cases/<uuid:case_id>/recommendations/<uuid:pk>/delete/',
        RecommendationViewSet.as_view({'delete': 'delete'}),
        name='recommendation-delete'
    ),
    
    # Legacy endpoints (still work, but use update-status instead)
    path(
        'cases/<uuid:case_id>/recommendations/<uuid:pk>/save/',
        RecommendationViewSet.as_view({'post': 'save'}),
        name='recommendation-save'
    ),
    path(
        'cases/<uuid:case_id>/recommendations/<uuid:pk>/discard/',
        RecommendationViewSet.as_view({'post': 'discard'}),
        name='recommendation-discard'
    ),
]
