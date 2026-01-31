"""
Custom throttle classes for rate limiting API requests.
"""

from rest_framework.throttling import UserRateThrottle


class PredictionRateThrottle(UserRateThrottle):
    """
    Throttle for AI prediction requests.
    
    More restrictive than general user throttle because predictions are expensive:
    - Load ML model
    - Image validation
    - Feature extraction
    - Model inference
    - Grad-CAM generation
    
    Rate: 200 predictions per hour per user (defined in settings.py)
    """
    scope = 'predictions'
