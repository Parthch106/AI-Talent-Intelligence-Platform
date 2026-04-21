from django.contrib import admin
from django.contrib.admin import AdminSite
from django.conf import settings
from .models import User, InternProfile, FullTimeOffer, StipendRecord


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


try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

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

try:
    admin.site.unregister(InternProfile)
except admin.sites.NotRegistered:
    pass

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


# ============================================================================
# Phase 5 — Offers & Stipends
# ============================================================================

try:
    admin.site.unregister(FullTimeOffer)
except admin.sites.NotRegistered:
    pass

@admin.register(FullTimeOffer)
class FullTimeOfferAdmin(admin.ModelAdmin):
    list_display = ('intern', 'status', 'issued_at', 'response_deadline')
    list_filter = ('status', 'issued_at')
    search_fields = ('intern__email', 'intern__full_name')
    readonly_fields = ('created_at', 'updated_at', 'ai_onboarding_plan', 'ai_offer_summary')

    fieldsets = (
        ('Offer Details', {
            'fields': ('intern', 'conversion_score', 'status', 'issued_by', 'issued_at', 'response_deadline')
        }),
        ('Role Recommendation', {
            'fields': ('recommended_role_title', 'recommended_department', 'salary_band_min', 'salary_band_max')
        }),
        ('AI Analysis', {
            'fields': ('ai_offer_summary', 'ai_onboarding_plan'),
        }),
        ('Intern Response', {
            'fields': ('intern_response_at', 'intern_response_notes'),
        }),
    )


try:
    admin.site.unregister(StipendRecord)
except admin.sites.NotRegistered:
    pass

@admin.register(StipendRecord)
class StipendRecordAdmin(admin.ModelAdmin):
    list_display = ('intern', 'month', 'amount', 'status', 'approved_at', 'disbursed_at')
    list_filter = ('status', 'month')
    search_fields = ('intern__email', 'intern__full_name')
    readonly_fields = ('approved_at', 'disbursed_at')


# Register with custom Talent Intelligence Admin Site
try:
    talent_admin_site.register(User, UserAdmin)
    talent_admin_site.register(InternProfile, InternProfileAdmin)
    talent_admin_site.register(FullTimeOffer, FullTimeOfferAdmin)
    talent_admin_site.register(StipendRecord, StipendRecordAdmin)
except admin.sites.AlreadyRegistered:
    pass
