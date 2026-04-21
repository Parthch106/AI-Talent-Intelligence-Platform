import logging
from datetime import date, timedelta
from django.db.models import Avg, Count, Sum, Q
from apps.analytics.models import WeeklyReportV2

logger = logging.getLogger(__name__)

RED_FLAG_THRESHOLDS = {
    'overall_weekly_score': 50.0,    # Below 50% triggers a flag
    'attendance_pct':       60.0,    # Below 60% (< 3 days/week) triggers a flag
    'tasks_overdue':        3,       # More than 3 overdue tasks triggers a flag
    'productivity_delta':  -20.0,    # Drop of 20+ points in one week triggers a flag
}

CONSECUTIVE_RED_FLAG_ESCALATION_THRESHOLD = 2   # 2 weeks in a row → escalate to admin

MISMATCH_TOLERANCE = 0.15   # 15% tolerance on numeric comparisons


def compute_weekly_metrics_v2(tasks_qs, attendance_qs, prior_report) -> dict:
    """
    Computes all WeeklyReportV2 metrics from pre-fetched querysets.
    """
    # ── Task aggregation ───────────────────────────────────────────────────────
    tasks_assigned    = tasks_qs.count()
    tasks_completed   = tasks_qs.filter(status='COMPLETED').count() # Note: Adjust if status names differ
    # Try alternate status if COMPLETED doesn't exist
    if tasks_completed == 0 and tasks_qs.filter(status='REVIEWED').exists():
        tasks_completed = tasks_qs.filter(status='REVIEWED').count()

    tasks_in_progress = tasks_qs.filter(status='IN_PROGRESS').count()
    tasks_overdue     = tasks_qs.filter(status='OVERDUE').count()

    quality_agg = tasks_qs.filter(
        quality_rating__isnull=False
    ).aggregate(avg_quality=Avg('quality_rating'))
    avg_task_quality_rating = quality_agg['avg_quality']

    hours_agg = tasks_qs.aggregate(
        estimated=Sum('estimated_hours'),
        actual=Sum('actual_hours'),
    )
    total_estimated_hours = hours_agg['estimated'] or 0.0
    total_actual_hours    = hours_agg['actual']    or 0.0

    if total_estimated_hours > 0:
        hour_variance_pct = round(
            ((total_actual_hours - total_estimated_hours) / total_estimated_hours) * 100, 2
        )
    else:
        hour_variance_pct = None

    # ── Attendance aggregation ─────────────────────────────────────────────────
    attendance_days = attendance_qs.filter(status='PRESENT').count()
    late_check_ins  = attendance_qs.filter(is_late=True).count()
    expected_days   = 5   # Standard working week
    attendance_pct  = round((attendance_days / expected_days) * 100, 2)

    # ── Performance scores ─────────────────────────────────────────────────────
    completion_rate   = (tasks_completed / max(tasks_assigned, 1)) * 100
    hours_bonus       = max(0, -hour_variance_pct) if hour_variance_pct is not None else 0
    productivity_score = round(min(completion_rate + (hours_bonus * 0.1), 100), 2)

    quality_score = round((avg_task_quality_rating / 5) * 100, 2) if avg_task_quality_rating else None

    overdue_penalty = tasks_overdue * 5
    engagement_score = round(max(0, attendance_pct - overdue_penalty), 2)

    # ── Week-over-week deltas ──────────────────────────────────────────────────
    if prior_report:
        productivity_delta = round(
            productivity_score - (prior_report.productivity_score or 0), 2
        )
        quality_delta = round(
            (quality_score or 0) - (prior_report.quality_score or 0), 2
        ) if quality_score is not None else None
    else:
        productivity_delta = None
        quality_delta      = None

    if productivity_delta is not None and quality_delta is not None:
        growth_score = round((productivity_delta + quality_delta) / 2, 2)
    else:
        growth_score = None

    # ── Overall weekly score ───────────────────────────────────────────────────
    score_components = [
        (productivity_score,          0.30),
        (quality_score or 50.0,       0.25),
        (engagement_score,            0.25),
        (attendance_pct,              0.20),
    ]
    overall_weekly_score = round(
        sum(score * weight for score, weight in score_components), 2
    )

    overall_delta = round(
        overall_weekly_score - (prior_report.overall_weekly_score or 0), 2
    ) if prior_report else None

    return {
        'tasks_assigned':          tasks_assigned,
        'tasks_completed':         tasks_completed,
        'tasks_in_progress':       tasks_in_progress,
        'tasks_overdue':           tasks_overdue,
        'avg_task_quality_rating': avg_task_quality_rating,
        'total_estimated_hours':   total_estimated_hours,
        'total_actual_hours':      total_actual_hours,
        'hour_variance_pct':       hour_variance_pct,
        'attendance_days':  attendance_days,
        'expected_days':    expected_days,
        'late_check_ins':   late_check_ins,
        'attendance_pct':   attendance_pct,
        'productivity_score':   productivity_score,
        'quality_score':        quality_score,
        'engagement_score':     engagement_score,
        'growth_score':         growth_score,
        'overall_weekly_score': overall_weekly_score,
        'productivity_delta': productivity_delta,
        'quality_delta':      quality_delta,
        'overall_delta':      overall_delta,
    }


def check_red_flags_v2(metrics: dict) -> list:
    """
    Evaluates metrics against RED_FLAG_THRESHOLDS.
    """
    flags = []

    if (
        metrics.get('overall_weekly_score') is not None
        and metrics['overall_weekly_score'] < RED_FLAG_THRESHOLDS['overall_weekly_score']
    ):
        flags.append(
            f"Overall weekly score {metrics['overall_weekly_score']:.1f}% is below the "
            f"{RED_FLAG_THRESHOLDS['overall_weekly_score']}% warning threshold."
        )

    if metrics['attendance_pct'] < RED_FLAG_THRESHOLDS['attendance_pct']:
        flags.append(
            f"Attendance {metrics['attendance_pct']:.1f}% is below the "
            f"{RED_FLAG_THRESHOLDS['attendance_pct']}% minimum ({metrics['attendance_days']}/{metrics['expected_days']} days)."
        )

    if metrics['tasks_overdue'] > RED_FLAG_THRESHOLDS['tasks_overdue']:
        flags.append(
            f"{metrics['tasks_overdue']} overdue tasks detected "
            f"(threshold: {RED_FLAG_THRESHOLDS['tasks_overdue']})."
        )

    if (
        metrics.get('productivity_delta') is not None
        and metrics['productivity_delta'] < RED_FLAG_THRESHOLDS['productivity_delta']
    ):
        flags.append(
            f"Productivity dropped by {metrics['productivity_delta']:.1f} points this week "
            f"(threshold: {RED_FLAG_THRESHOLDS['productivity_delta']})."
        )

    return flags


def check_consecutive_red_flags_v2(intern) -> int:
    """
    Returns the number of consecutive weeks the intern has had a red flag.
    """
    recent_reports = WeeklyReportV2.objects.filter(
        intern=intern,
        is_auto_generated=True
    ).order_by('-week_start')[:CONSECUTIVE_RED_FLAG_ESCALATION_THRESHOLD]

    if len(recent_reports) < CONSECUTIVE_RED_FLAG_ESCALATION_THRESHOLD:
        return sum(1 for r in recent_reports if r.red_flag)

    return CONSECUTIVE_RED_FLAG_ESCALATION_THRESHOLD if all(
        r.red_flag for r in recent_reports
    ) else 0


def detect_mismatch_v2(system_metrics: dict, self_report) -> tuple[bool, list]:
    """
    Compares system-measured values against the intern's own self-report.
    """
    discrepancies = []

    if self_report.tasks_completed:
        system_val = system_metrics['tasks_completed']
        intern_val = self_report.tasks_completed
        diff = abs(system_val - intern_val)
        if diff / max(system_val, 1) > MISMATCH_TOLERANCE:
            discrepancies.append(
                f"Task completion mismatch: system recorded {system_val}, "
                f"intern reported {intern_val} "
                f"(>{int(MISMATCH_TOLERANCE * 100)}% difference)."
            )

    if self_report.attendance_days:
        system_val = system_metrics['attendance_days']
        intern_val = self_report.attendance_days
        if system_val != intern_val:
            discrepancies.append(
                f"Attendance mismatch: system recorded {system_val} days present, "
                f"intern reported {intern_val} days."
            )

    if self_report.total_actual_hours:
        system_val = system_metrics['total_actual_hours']
        intern_val = self_report.total_actual_hours
        if system_val > 0:
            diff_pct = abs(system_val - intern_val) / system_val
            if diff_pct > MISMATCH_TOLERANCE:
                discrepancies.append(
                    f"Hours mismatch: system recorded {system_val:.1f}h actual, "
                    f"intern reported {intern_val:.1f}h "
                    f"(>{int(MISMATCH_TOLERANCE * 100)}% difference)."
                )

    if self_report.tasks_overdue is not None:
        system_val = system_metrics['tasks_overdue']
        intern_val = self_report.tasks_overdue
        if system_val != intern_val:
            discrepancies.append(
                f"Overdue tasks mismatch: system recorded {system_val}, "
                f"intern reported {intern_val}."
            )

    return bool(discrepancies), discrepancies
