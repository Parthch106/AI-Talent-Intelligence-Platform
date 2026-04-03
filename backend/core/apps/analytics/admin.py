from django.contrib import admin
from django.conf import settings
from .models import (
    TaskTracking,
    AttendanceRecord,
    WeeklyReport,
    PerformanceMetrics,
    MonthlyEvaluationReport,
    # V2 ML Pipeline Models
    JobRole,
    Application,
    ResumeSection,
    ResumeEmbedding,
    StructuredFeature,
    ModelPrediction,
    HiringOutcome,
    GrowthTracking,
    ModelRegistry,
    # RL Models
    SkillProfile,
    TaskTemplate,
    LearningPath,
    RLExperienceBuffer,
)


# Customize Admin Site Header
admin.site.site_header = getattr(settings, 'SITE_HEADER', 'AI Talent Intelligence')
admin.site.site_title = getattr(settings, 'SITE_TITLE', 'Talent Intelligence Platform')
admin.site.index_title = getattr(settings, 'INDEX_TITLE', 'Welcome to Talent Intelligence Platform')


@admin.register(TaskTracking)
class TaskTrackingAdmin(admin.ModelAdmin):
    list_display = ('intern', 'task_id', 'title', 'status', 'priority', 'due_date', 'quality_rating', 'code_review_score')
    list_filter = ('status', 'priority', 'due_date', 'rework_required')
    search_fields = ('intern__full_name', 'task_id', 'title')
    readonly_fields = ('assigned_at', 'submitted_at', 'completed_at')
    fieldsets = (
        ('Task Details', {
            'fields': ('intern', 'task_id', 'title', 'description')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority')
        }),
        ('Dates', {
            'fields': ('assigned_at', 'due_date', 'submitted_at', 'completed_at')
        }),
        ('Time Tracking', {
            'fields': ('estimated_hours', 'actual_hours')
        }),
        ('Evaluation (For Manager)', {
            'fields': ('quality_rating', 'code_review_score', 'bug_count', 'mentor_feedback', 'rework_required')
        }),
    )


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
# V2 ML Pipeline Models
# ============================================================================

@admin.register(JobRole)
class JobRoleAdmin(admin.ModelAdmin):
    list_display = ('role_title', 'created_at', 'updated_at')
    search_fields = ('role_title', 'role_description')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('intern', 'job_role', 'application_status', 'created_at')
    list_filter = ('application_status', 'job_role')
    search_fields = ('intern__full_name', 'intern__email')


@admin.register(ResumeSection)
class ResumeSectionAdmin(admin.ModelAdmin):
    list_display = ('application', 'created_at')
    search_fields = ('application__intern__full_name',)


@admin.register(ResumeEmbedding)
class ResumeEmbeddingAdmin(admin.ModelAdmin):
    list_display = ('application', 'created_at')
    search_fields = ('application__intern__full_name',)


@admin.register(StructuredFeature)
class StructuredFeatureAdmin(admin.ModelAdmin):
    list_display = ('application', 'skill_match_ratio', 'critical_skill_gap_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('application__intern__full_name',)


@admin.register(ModelPrediction)
class ModelPredictionAdmin(admin.ModelAdmin):
    list_display = ('application', 'decision', 'suitability_score', 'semantic_match_score', 'confidence_score', 'model_type', 'created_at')
    list_filter = ('decision', 'model_type', 'model_version')
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


@admin.register(ModelRegistry)
class ModelRegistryAdmin(admin.ModelAdmin):
    list_display = ('model_name', 'model_version', 'training_accuracy', 'f1_score', 'created_at')
    list_filter = ('model_name',)
    search_fields = ('model_name', 'model_version')


# ============================================================================
# RL Dynamic Task Assignment & Learning Path Models
# ============================================================================

@admin.register(SkillProfile)
class SkillProfileAdmin(admin.ModelAdmin):
    list_display = ('intern', 'skill_name', 'mastery_level', 'learning_rate', 'last_updated')
    list_filter = ('skill_name', 'last_updated')
    search_fields = ('intern__full_name', 'intern__email', 'skill_name')
    ordering = ('-mastery_level',)


@admin.register(TaskTemplate)
class TaskTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'difficulty', 'action_type', 'estimated_hours', 'success_probability', 'learning_value', 'is_active')
    list_filter = ('difficulty', 'action_type', 'is_active')
    search_fields = ('title', 'description')


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ('intern', 'target_role_title', 'current_position', 'completion_percentage', 'updated_at')
    list_filter = ('job_role', 'updated_at')
    search_fields = ('intern__full_name', 'intern__email', 'target_role_title')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RLExperienceBuffer)
class RLExperienceBufferAdmin(admin.ModelAdmin):
    list_display = ('intern', 'action', 'reward', 'done', 'timestamp')
    list_filter = ('action', 'done', 'timestamp')
    search_fields = ('intern__full_name', 'intern__email', 'action')
    readonly_fields = ('timestamp',)
