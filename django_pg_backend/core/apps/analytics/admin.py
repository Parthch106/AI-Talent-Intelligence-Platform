from django.contrib import admin
from .models import InternIntelligence, ResumeFeature, AnalyticsSnapshot


@admin.register(InternIntelligence)
class InternIntelligenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'technical_score', 'leadership_score', 'ai_readiness_score', 'calculated_at')
    list_filter = ('technical_score', 'ai_readiness_score')
    search_fields = ('user__full_name', 'user__email')
    readonly_fields = ('calculated_at', 'updated_at')


@admin.register(ResumeFeature)
class ResumeFeatureAdmin(admin.ModelAdmin):
    list_display = ('resume_data', 'overall_score', 'skill_diversity_score', 'technical_ratio', 'calculated_at')
    list_filter = ('overall_score',)
    search_fields = ('resume_data__user__full_name',)


@admin.register(AnalyticsSnapshot)
class AnalyticsSnapshotAdmin(admin.ModelAdmin):
    list_display = ('snapshot_type', 'snapshot_date', 'total_interns', 'high_potential_count', 'at_risk_count')
    list_filter = ('snapshot_type', 'snapshot_date')
    readonly_fields = ('created_at',)
