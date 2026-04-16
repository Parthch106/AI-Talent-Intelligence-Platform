from django.contrib import admin
from django.contrib.admin import AdminSite
from django.conf import settings
from .models import User, InternProfile


class TalentIntelligenceAdminSite(AdminSite):
    """
    Custom Admin Site for Talent Intelligence Platform
    """
    site_header = getattr(settings, 'SITE_HEADER', 'AI Talent Intelligence')
    site_title = getattr(settings, 'SITE_TITLE', 'Talent Intelligence Platform')
    index_title = getattr(settings, 'INDEX_TITLE', 'Welcome to Talent Intelligence Platform')
    
    def each_context(self, request):
        context = super().each_context(request)
        context['site_logo'] = '/static/images/logo.svg'
        return context


# Create custom admin site instance
talent_admin_site = TalentIntelligenceAdminSite(name='talent_admin')


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'role', 'department', 'is_active', 'date_joined')
    list_filter = ('role', 'department', 'is_active', 'is_staff')
    search_fields = ('email', 'full_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        ('Personal Info', {'fields': ('email', 'full_name')}),
        ('Role & Permissions', {'fields': ('role', 'department', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )


# ============================================================================
# V2 — InternProfile Admin
# ============================================================================

@admin.register(InternProfile)
class InternProfileAdmin(admin.ModelAdmin):
    list_display  = (
        'user', 'status', 'join_date', 'expected_end_date', 'actual_end_date',
        'assigned_manager', 'created_at',
    )
    list_filter   = ('status',)
    search_fields = ('user__email', 'user__full_name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ['user', 'assigned_manager']

    fieldsets = (
        ('Intern', {
            'fields': ('user',)
        }),
        ('Career Status', {
            'fields': ('status', 'join_date', 'expected_end_date', 'actual_end_date')
        }),
        ('Management', {
            'fields': ('assigned_manager', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
