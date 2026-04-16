from rest_framework import serializers
from apps.analytics.models import (
    EmploymentStage,
    PhaseEvaluation,
    CertificationCriteria,
)


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
