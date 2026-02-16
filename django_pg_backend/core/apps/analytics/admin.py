from django.contrib import admin
from .models import (
    TaskTracking,
    AttendanceRecord,
    WeeklyReport,
    PerformanceMetrics,
    MonthlyEvaluationReport,
    # New ML Pipeline Models
    JobRole,
    Application,
    ResumeFeature,
    ModelPrediction,
    HiringOutcome,
    GrowthTracking,
    AuthenticityReview,
    ModelRegistry,
)


@admin.register(TaskTracking)
class TaskTrackingAdmin(admin.ModelAdmin):
    list_display = ('intern', 'task_id', 'title', 'status', 'due_date')
    list_filter = ('status', 'due_date')
    search_fields = ('intern__full_name', 'title')


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('intern', 'date', 'status', 'check_in_time', 'check_out_time')
    list_filter = ('date', 'status')
    search_fields = ('intern__full_name',)


@admin.register(WeeklyReport)
class WeeklyReportAdmin(admin.ModelAdmin):
    list_display = ('intern', 'week_start_date', 'submitted_at')
    list_filter = ('week_start_date',)
    search_fields = ('intern__full_name',)


@admin.register(PerformanceMetrics)
class PerformanceMetricsAdmin(admin.ModelAdmin):
    list_display = ('intern', 'period_start', 'period_type', 'productivity_score', 'overall_performance_score')
    list_filter = ('period_type', 'period_start')
    search_fields = ('intern__full_name',)


@admin.register(MonthlyEvaluationReport)
class MonthlyEvaluationReportAdmin(admin.ModelAdmin):
    list_display = ('intern', 'evaluation_month', 'period_start', 'period_end', 'overall_performance_score')
    list_filter = ('evaluation_month', 'period_start')
    search_fields = ('intern__full_name',)


# ============================================================================
# New ML Pipeline Models
# ============================================================================

@admin.register(JobRole)
class JobRoleAdmin(admin.ModelAdmin):
    list_display = ('role_title', 'created_at', 'updated_at')
    search_fields = ('role_title', 'role_description')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('intern', 'job_role', 'status', 'application_date')
    list_filter = ('status', 'job_role')
    search_fields = ('intern__full_name', 'intern__email')


@admin.register(ResumeFeature)
class ResumeFeatureAdmin(admin.ModelAdmin):
    list_display = ('application', 'skill_match_ratio', 'critical_skill_gap_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('application__intern__full_name',)


@admin.register(ModelPrediction)
class ModelPredictionAdmin(admin.ModelAdmin):
    list_display = ('application', 'decision', 'suitability_score', 'confidence_score', 'created_at')
    list_filter = ('decision', 'model_version')
    search_fields = ('application__intern__full_name',)


@admin.register(HiringOutcome)
class HiringOutcomeAdmin(admin.ModelAdmin):
    list_display = ('application', 'shortlisted', 'hired', 'offer_accepted', 'recorded_at')
    list_filter = ('shortlisted', 'hired', 'offer_accepted')
    search_fields = ('application__intern__full_name',)


@admin.register(GrowthTracking)
class GrowthTrackingAdmin(admin.ModelAdmin):
    list_display = ('intern', 'months_since_joining', 'performance_rating', 'retention_status', 'created_at')
    list_filter = ('retention_status', 'promotion_received')
    search_fields = ('intern__full_name',)


@admin.register(AuthenticityReview)
class AuthenticityReviewAdmin(admin.ModelAdmin):
    list_display = ('application', 'authenticity_label', 'reviewed_by', 'reviewed_at')
    list_filter = ('authenticity_label',)
    search_fields = ('application__intern__full_name',)


@admin.register(ModelRegistry)
class ModelRegistryAdmin(admin.ModelAdmin):
    list_display = ('model_name', 'model_version', 'training_accuracy', 'f1_score', 'created_at')
    list_filter = ('model_name',)
    search_fields = ('model_name', 'model_version')
