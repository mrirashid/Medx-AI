from django.urls import path
from .views import ActivityViewSet

urlpatterns = [
    # List activities
    path(
        'activities/',
        ActivityViewSet.as_view({'get': 'list'}),
        name='activity-list'
    ),
    
    # Get single activity
    path(
        'activities/<uuid:pk>/',
        ActivityViewSet.as_view({'get': 'retrieve'}),
        name='activity-detail'
    ),
    
    # Get recent activities
    path(
        'activities/recent/',
        ActivityViewSet.as_view({'get': 'recent'}),
        name='activity-recent'
    ),
    
    # Get activities by entity
    path(
        'activities/by-entity/',
        ActivityViewSet.as_view({'get': 'by_entity'}),
        name='activity-by-entity'
    ),
]
