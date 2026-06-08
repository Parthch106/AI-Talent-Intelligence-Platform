from django.contrib import admin
from django.conf import settings
from .models import ConversionScore
from .models import (
    TaskTracking,
    AttendanceRecord,
    WeeklyReport,
    PerformanceMetrics,
    MonthlyEvaluationReport,
    WeeklyReportV2,
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
    # V2 Phase 1 — Career Progression
    EmploymentStage,
    PhaseEvaluation,
    CertificationCriteria,
    IoTDevice,
    CertificationRecord,
)

from django.utils import timezone
from django.utils.html import format_html


@admin.register(CertificationRecord)
class CertificationRecordAdmin(admin.ModelAdmin):
    list_display = (
        'intern', 'cert_type', 'issue_date', 'overall_score_at_issue',
        'is_revoked', 'view_certificate'
    )
    list_filter = ('cert_type', 'is_revoked', 'issue_date')
    search_fields = ('intern__email', 'intern__full_name', 'unique_cert_id')
    readonly_fields = (
        'unique_cert_id', 'issue_date', 'certificate_file',
        'overall_score_at_issue', 'scores_snapshot', 'criteria_snapshot',
        'revoked_at', 'revoked_by'
    )
    fieldsets = (
        ('Basic Information', {
            'fields': ('unique_cert_id', 'intern', 'cert_type', 'issue_date', 'certificate_file')
        }),
        ('Performance Snapshot', {
            'fields': ('overall_score_at_issue', 'scores_snapshot', 'criteria_snapshot'),
            'classes': ('collapse',),
        }),
        ('Revocation Status', {
            'fields': ('is_revoked', 'revoked_at', 'revoked_by', 'revocation_reason')
        }),
    )
    actions = ['revoke_certificates', 'reinstate_certificates']

    @admin.display(description='Certificate')
    def view_certificate(self, obj):
        if obj.certificate_file:
            return format_html(
                '<a href="{}" target="_blank" class="button">View PDF</a>',
                obj.certificate_file.url
            )
        return "Not Generated"

    @admin.action(description='Revoke selected certificates')
    def revoke_certificates(self, request, queryset):
        queryset.update(
            is_revoked=True,
            revoked_at=timezone.now(),
            revoked_by=request.user
        )
        self.message_user(request, f"{queryset.count()} certificates revoked.")

    @admin.action(description='Reinstate selected certificates')
    def reinstate_certificates(self, request, queryset):
        queryset.update(
            is_revoked=False,
            revoked_at=None,
            revoked_by=None
        )
        self.message_user(request, f"{queryset.count()} certificates reinstated.")


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


# ============================================================================
# V2 Phase 1 — Career Progression Admin
# ============================================================================

@admin.register(EmploymentStage)
class EmploymentStageAdmin(admin.ModelAdmin):
    list_display  = (
        'intern', 'phase', 'phase_start_date', 'phase_end_date',
        'stipend_amount', 'conversion_score', 'promoted_by', 'created_at'
    )
    list_filter   = ('phase',)
    search_fields = ('intern__email', 'intern__full_name')
    readonly_fields = ('created_at',)
    date_hierarchy  = 'phase_start_date'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('intern', 'promoted_by')


@admin.register(CertificationCriteria)
class CertificationCriteriaAdmin(admin.ModelAdmin):
    list_display  = (
        'phase', 'is_active',
        'min_overall_score', 'min_productivity_score',
        'min_quality_score', 'min_attendance_pct',
        'created_by', 'created_at',
    )
    list_filter   = ('phase', 'is_active')
    search_fields = ('description',)
    readonly_fields = ('created_at', 'created_by')
    actions   = ['seed_defaults']

    @admin.action(description='Seed default criteria (Phase 1, Phase 2, PPO)')
    def seed_defaults(self, request, queryset):
        defaults = [
            {
                'phase': 'PHASE_1',
                'min_overall_score': 75.0,
                'min_productivity_score': 70.0,
                'min_quality_score': 70.0,
                'min_attendance_pct': 60.0,
                'is_active': True,
                'description': 'Default Phase 1 gate criteria',
                'created_by': request.user,
            },
            {
                'phase': 'PHASE_2',
                'min_overall_score': 75.0,
                'min_productivity_score': 72.0,
                'min_quality_score': 72.0,
                'min_attendance_pct': 65.0,
                'is_active': True,
                'description': 'Default Phase 2 gate criteria',
                'created_by': request.user,
            },
            {
                'phase': 'PPO',
                'min_overall_score': 80.0,
                'min_productivity_score': 75.0,
                'min_quality_score': 75.0,
                'min_attendance_pct': 70.0,
                'is_active': True,
                'description': 'Default PPO certificate criteria',
                'created_by': request.user,
            },
        ]
        created = 0
        for d in defaults:
            _, is_new = CertificationCriteria.objects.get_or_create(
                phase=d['phase'],
                is_active=True,
                defaults=d,
            )
            if is_new:
                created += 1
        self.message_user(request, f'{created} default criteria set(s) seeded.')


@admin.register(PhaseEvaluation)
class PhaseEvaluationAdmin(admin.ModelAdmin):
    list_display  = (
        'intern', 'employment_stage', 'decision', 'criteria_met',
        'overall_score', 'productivity_score', 'quality_score',
        'attendance_pct', 'evaluated_by', 'evaluated_at',
    )
    list_filter   = ('decision', 'criteria_met')
    search_fields = ('intern__email', 'intern__full_name')
    readonly_fields = (
        'evaluated_at', 'criteria_snapshot', 'criteria_met',
        'ai_recommendation', 'ai_decision_suggestion',
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'intern', 'employment_stage', 'evaluated_by'
        )


@admin.register(WeeklyReportV2)
class WeeklyReportV2Admin(admin.ModelAdmin):
    list_display = (
        'intern', 'week_start', 'week_number', 'is_auto_generated',
        'overall_weekly_score', 'red_flag', 'manager_reviewed'
    )
    list_filter = (
        'is_auto_generated', 'red_flag', 'manager_reviewed', 'week_start'
    )
    search_fields = ('intern__username', 'intern__email')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Info', {
            'fields': ('intern', 'week_start', 'week_end', 'week_number', 'is_auto_generated')
        }),
        ('Metrics', {
            'fields': (
                'tasks_assigned', 'tasks_completed', 'tasks_overdue', 'attendance_pct',
                'productivity_score', 'quality_score', 'overall_weekly_score', 'cumulative_overall_score'
            )
        }),
        ('AI Analysis', {
            'fields': ('ai_narrative', 'ai_top_achievement', 'ai_concern_area', 'ai_growth_note')
        }),
        ('Flags & Mismatch', {
            'fields': ('red_flag', 'red_flag_reasons', 'self_report_mismatch', 'self_report_mismatch_details')
        }),
        ('Review', {
            'fields': ('manager_reviewed', 'manager_comment', 'reviewed_by', 'reviewed_at')
        }),
    )


@admin.register(IoTDevice)
class IoTDeviceAdmin(admin.ModelAdmin):
    list_display  = ('device_id', 'device_type', 'location', 'is_active', 'last_seen_at', 'registered_at')
    list_filter   = ('device_type', 'is_active')
    search_fields = ('device_id', 'location')
    readonly_fields = ('registered_at',)


@admin.register(ConversionScore)
class ConversionScoreAdmin(admin.ModelAdmin):
    list_display = ('intern', 'composite_score', 'computed_at', 'model_version')
    list_filter = ('model_version', 'computed_at')
    search_fields = ('intern__email', 'intern__full_name')
    readonly_fields = ('computed_at',)
