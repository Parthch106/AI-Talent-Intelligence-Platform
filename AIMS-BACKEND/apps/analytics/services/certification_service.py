import logging
from datetime import date
from django.db.models import Avg, Count, Q
from django.conf import settings
from apps.analytics.models import (
    CertificationCriteria, 
    CertificationRecord, 
    PerformanceMetrics, 
    WeeklyReport,
    WeeklyReportV2
)

logger = logging.getLogger(__name__)

def get_aggregated_scores(intern, start_date, end_date):
    """
    Aggregates performance metrics for an intern over a specific period.
    Pulls from PerformanceMetrics (tasks, quality) and WeeklyReport (attendance, submissions).
    """
    metrics = PerformanceMetrics.objects.filter(
        intern=intern,
        period_start__gte=start_date,
        period_end__lte=end_date
    ).aggregate(
        avg_overall=Avg('overall_performance_score'),
        avg_productivity=Avg('productivity_score'),
        avg_quality=Avg('quality_score'),
        avg_engagement=Avg('engagement_score')
    )

    # Try V2 reports first for attendance and submissions
    v2_reports = WeeklyReportV2.objects.filter(
        intern=intern,
        week_start__gte=start_date,
        week_start__lte=end_date
    ).aggregate(
        avg_attendance=Avg('attendance_pct'),
        total_submitted=Count('id')
    )

    if v2_reports['total_submitted'] > 0:
        reports = v2_reports
    else:
        # Fallback to V1
        reports = WeeklyReport.objects.filter(
            intern=intern,
            week_start_date__gte=start_date,
            week_start_date__lte=end_date
        ).aggregate(
            avg_attendance=Avg('mentor_rating'), # V1 doesn't have attendance, using rating as proxy or 0
            total_submitted=Count('id')
        )
        # Fix: V1 doesn't have attendance, so we might need to pull from AttendanceRecord
        from apps.analytics.models import AttendanceRecord
        att_count = AttendanceRecord.objects.filter(
            intern=intern, 
            date__gte=start_date, 
            date__lte=end_date,
            status='PRESENT'
        ).count()
        total_days = (end_date - start_date).days + 1
        if total_days > 0:
            reports['avg_attendance'] = (att_count / total_days) * 100

    return {
        'overall_score':      metrics['avg_overall']      or 0.0,
        'productivity_score': metrics['avg_productivity'] or 0.0,
        'quality_score':      metrics['avg_quality']      or 0.0,
        'engagement_score':   metrics['avg_engagement']   or 0.0,
        'attendance_pct':     reports['avg_attendance']   or 0.0,
        'weekly_reports_submitted': reports['total_submitted'] or 0,
    }

def evaluate_criteria(scores, criteria):
    """
    Evaluates a set of aggregated scores against a CertificationCriteria object.
    Returns: (passed: bool, failed_checks: list, scores: dict, criteria_used: dict)
    """
    failed_checks = []
    
    mapping = {
        'min_overall_score':      'overall_score',
        'min_productivity_score': 'productivity_score',
        'min_quality_score':      'quality_score',
        'min_engagement_score':   'engagement_score',
        'min_attendance_pct':     'attendance_pct',
        'min_weekly_reports_submitted': 'weekly_reports_submitted',
    }

    for attr, score_key in mapping.items():
        threshold = getattr(criteria, attr)
        if threshold is not None:
            actual = scores.get(score_key, 0)
            if actual < threshold:
                failed_checks.append({
                    'metric': score_key,
                    'required': threshold,
                    'actual': actual
                })

    return {
        'passed': len(failed_checks) == 0,
        'failed_checks': failed_checks,
        'scores': scores,
        'criteria_used': {
            m: getattr(criteria, m) for m in mapping.keys() if getattr(criteria, m) is not None
        }
    }
