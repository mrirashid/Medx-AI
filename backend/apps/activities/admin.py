from django.contrib import admin
from .models import Activity


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'entity_type', 'entity_id', 'created_at']
    list_filter = ['action', 'entity_type', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'entity_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Action Details', {
            'fields': ('user', 'action', 'entity_type', 'entity_id')
        }),
        ('Additional Information', {
            'fields': ('details', 'ip_address', 'user_agent')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Activities should only be created programmatically
        return False
    
    def has_change_permission(self, request, obj=None):
        # Activities should be immutable
        return False
