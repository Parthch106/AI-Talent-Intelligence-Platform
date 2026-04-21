from rest_framework import serializers
from apps.analytics.models import (
    EmploymentStage,
    PhaseEvaluation,
    CertificationCriteria,
    CertificationRecord,
    WeeklyReportV2,
    ConversionScore,
)
from apps.accounts.models import FullTimeOffer, StipendRecord


# ============================================================================
# V2 Phase 1 — Career Progression Serializers
# ============================================================================

class EmploymentStageSerializer(serializers.ModelSerializer):
    intern_email     = serializers.EmailField(source='intern.email',          read_only=True)
    intern_name      = serializers.CharField(source='intern.full_name',       read_only=True)
    promoted_by_name = serializers.CharField(source='promoted_by.full_name',  read_only=True, allow_null=True)
    phase_display    = serializers.CharField(source='get_phase_display',      read_only=True)
    is_active        = serializers.SerializerMethodField()

    class Meta:
        model  = EmploymentStage
        fields = [
            'id',
            'intern', 'intern_email', 'intern_name',
            'phase', 'phase_display',
            'phase_start_date', 'phase_end_date',
            'is_active',
            'stipend_amount', 'conversion_score',
            'promoted_by', 'promoted_by_name',
            'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_is_active(self, obj) -> bool:
        return obj.phase_end_date is None


class CertificationCriteriaSerializer(serializers.ModelSerializer):
    phase_display      = serializers.CharField(source='get_phase_display', read_only=True)
    created_by_name    = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model  = CertificationCriteria
        fields = [
            'id',
            'phase', 'phase_display',
            'min_overall_score', 'min_productivity_score',
            'min_quality_score', 'min_engagement_score',
            'min_attendance_pct', 'min_weekly_reports_submitted',
            'is_active', 'description',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PhaseEvaluationSerializer(serializers.ModelSerializer):
    intern_email        = serializers.EmailField(source='intern.email',            read_only=True)
    intern_name         = serializers.CharField(source='intern.full_name',         read_only=True)
    evaluated_by_name   = serializers.CharField(source='evaluated_by.full_name',   read_only=True, allow_null=True)
    phase_display       = serializers.CharField(source='employment_stage.get_phase_display', read_only=True)
    decision_display    = serializers.CharField(source='get_decision_display',     read_only=True)

    class Meta:
        model  = PhaseEvaluation
        fields = [
            'id',
            'intern', 'intern_email', 'intern_name',
            'employment_stage', 'phase_display',
            'evaluated_by', 'evaluated_by_name', 'evaluated_at',
            # Score snapshot
            'overall_score', 'productivity_score', 'quality_score',
            'engagement_score', 'attendance_pct', 'weekly_reports_submitted',
            # AI
            'ai_recommendation', 'ai_decision_suggestion',
            # Decision
            'decision', 'decision_display', 'manager_notes',
            # Criteria
            'criteria_snapshot', 'criteria_met',
        ]
        read_only_fields = [
            'id', 'evaluated_at',
            'criteria_snapshot', 'criteria_met',
            'ai_recommendation', 'ai_decision_suggestion',
        ]


class CertificationRecordSerializer(serializers.ModelSerializer):
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    cert_type_display = serializers.CharField(source='get_cert_type_display', read_only=True)
    
    class Meta:
        model = CertificationRecord
        fields = [
            'unique_cert_id', 'intern', 'intern_name',
            'cert_type', 'cert_type_display', 'issue_date',
            'certificate_file', 'overall_score_at_issue',
            'is_revoked', 'revocation_reason'
        ]
        read_only_fields = ['unique_cert_id', 'issue_date', 'certificate_file']


class WeeklyReportV2Serializer(serializers.ModelSerializer):
    intern_name = serializers.CharField(source='intern.get_full_name', read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    hour_efficiency = serializers.FloatField(read_only=True)
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name', read_only=True, allow_null=True
    )

    class Meta:
        model = WeeklyReportV2
        fields = [
            'id', 'intern', 'intern_name',
            'week_start', 'week_end', 'week_number', 'is_auto_generated',
            'tasks_assigned', 'tasks_completed', 'tasks_in_progress', 'tasks_overdue',
            'avg_task_quality_rating', 'total_estimated_hours', 'total_actual_hours',
            'hour_variance_pct', 'completion_rate', 'hour_efficiency',
            'attendance_days', 'expected_days', 'late_check_ins', 'attendance_pct',
            'productivity_score', 'quality_score', 'engagement_score',
            'growth_score', 'overall_weekly_score',
            'productivity_delta', 'quality_delta', 'overall_delta',
            'cumulative_overall_score',
            'ai_narrative', 'ai_top_achievement', 'ai_concern_area', 'ai_growth_note',
            'red_flag', 'red_flag_reasons',
            'intern_self_report', 'self_report_mismatch', 'self_report_mismatch_details',
            'manager_reviewed', 'manager_comment', 'reviewed_at',
            'reviewed_by', 'reviewed_by_name',
            'created_at',
        ]
        read_only_fields = [
            'id', 'is_auto_generated', 'week_number',
            'productivity_score', 'quality_score', 'engagement_score',
            'growth_score', 'overall_weekly_score',
            'productivity_delta', 'quality_delta', 'overall_delta',
            'cumulative_overall_score',
            'ai_narrative', 'ai_top_achievement', 'ai_concern_area', 'ai_growth_note',
            'red_flag', 'red_flag_reasons',
            'self_report_mismatch', 'self_report_mismatch_details',
            'manager_reviewed', 'reviewed_at', 'reviewed_by',
            'created_at',
        ]


class WeeklyReportCommentV2Serializer(serializers.Serializer):
    manager_comment = serializers.CharField(max_length=2000, allow_blank=True)


# ============================================================================
# Phase 5 — Full-Time Offers & Stipend
# ============================================================================

class ConversionScoreSerializer(serializers.ModelSerializer):
    intern_username = serializers.CharField(source='intern.username', read_only=True)

    class Meta:
        model  = ConversionScore
        fields = [
            'id', 'intern', 'intern_username', 'computed_at',
            'performance_trend_score', 'absolute_performance_score',
            'skill_growth_delta', 'manager_sentiment_trend',
            'peer_comparison_percentile', 'composite_score',
            'model_version', 'feature_vector',
        ]
        read_only_fields = fields


class FullTimeOfferSerializer(serializers.ModelSerializer):
    intern_name      = serializers.CharField(source='intern.get_full_name', read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    issued_by_name   = serializers.CharField(source='issued_by.get_full_name', read_only=True, allow_null=True)
    composite_score  = serializers.FloatField(source='conversion_score.composite_score', read_only=True)

    class Meta:
        model  = FullTimeOffer
        fields = [
            'id', 'intern', 'intern_name',
            'conversion_score', 'composite_score',
            'issued_by', 'issued_by_name', 'issued_at', 'status', 'status_display',
            'recommended_role_title', 'recommended_department',
            'salary_band_min', 'salary_band_max',
            'ai_onboarding_plan', 'ai_offer_summary',
            'response_deadline', 'intern_response_at', 'intern_response_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'issued_at', 'intern_response_at',
            'ai_onboarding_plan', 'ai_offer_summary',
            'created_at', 'updated_at',
        ]


class StipendRecordSerializer(serializers.ModelSerializer):
    intern_name    = serializers.CharField(source='intern.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    month_display  = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model  = StipendRecord
        fields = [
            'id', 'intern', 'intern_name',
            'month', 'month_display', 'amount',
            'status', 'status_display',
            'approved_by', 'approved_by_name', 'approved_at', 'disbursed_at',
            'performance_score_at_disbursement', 'notes',
        ]
        read_only_fields = ['id', 'approved_at', 'disbursed_at', 'performance_score_at_disbursement']

    def get_month_display(self, obj):
        return obj.month.strftime('%B %Y')
