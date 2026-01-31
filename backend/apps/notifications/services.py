from typing import Optional

from apps.users.models import User
from .models import Notification


def notify(
    user: User,
    title: str,
    message: str = "",
    *,
    level: str = Notification.LEVEL_INFO,
    entity_type: str = "",
    entity_id=None,
    created_by: Optional[User] = None,
) -> Notification:
    """Create a notification for a single user."""
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        level=level,
        entity_type=entity_type,
        entity_id=entity_id,
        created_by=created_by,
        updated_by=created_by,
    )
