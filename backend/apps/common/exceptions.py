# apps/common/exceptions.py
"""Custom exceptions for soft delete operations"""


class RestoreConflictError(Exception):
    """Raised when restoring a soft-deleted record would violate a unique constraint"""
    
    def __init__(self, message, conflict_fields=None, active_record_id=None):
        self.conflict_fields = conflict_fields or []
        self.active_record_id = active_record_id
        super().__init__(message)


class CannotRestoreError(Exception):
    """Raised when restore is blocked due to unresolvable conflicts"""
    pass


class AlreadyDeletedError(Exception):
    """Raised when trying to delete an already deleted record"""
    pass


class NotDeletedError(Exception):
    """Raised when trying to restore a record that isn't deleted"""
    pass
