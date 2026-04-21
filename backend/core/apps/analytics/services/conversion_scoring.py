import logging
from django.db.models import Avg

logger = logging.getLogger(__name__)

def compute_conversion_score(intern) -> dict:
    """
    Computes the weighted ConversionScore for a given intern.
    Reads from: WeeklyReport, PerformanceMetrics (existing), MonthlyEvaluation (existing).

    Returns a dict of all component scores and the composite, ready to save.
    """
    from apps.analytics.models import WeeklyReport

    # ── 1. Performance Trend Score (0–100) ────────────────────────────────────
    # Measures whether overall_weekly_score is improving over time.
    # Method: linear regression slope divided by max possible slope × 100.
    reports = list(
        WeeklyReport.objects.filter(intern=intern, is_auto_generated=True)
        .order_by('week_start')
        .values_list('overall_weekly_score', flat=True)
    )
    performance_trend = _compute_trend_score(reports)

    # ── 2. Absolute Performance Score (0–100) ──────────────────────────────────
    # Simple average of all weekly overall scores.
    valid_reports = [r for r in reports if r is not None]
    absolute_performance = sum(valid_reports) / max(len(valid_reports), 1)

    # ── 3. Skill Growth Delta (0–100) ──────────────────────────────────────────
    # Compares number of distinct skills at Phase 1 start vs now.
    skill_growth = _compute_skill_growth(intern)

    # ── 4. Manager Sentiment Trend (0–100) ────────────────────────────────────
    # Averages sentiment polarity over all manager_comment and feedback text.
    manager_sentiment = _compute_manager_sentiment(intern)

    # ── 5. Peer Comparison Percentile (0–100) ─────────────────────────────────
    # Where does this intern's absolute_performance sit in the current cohort?
    peer_percentile = _compute_peer_percentile(intern, absolute_performance)

    # ── 6. Composite (weighted ensemble) ──────────────────────────────────────
    composite = round(
        performance_trend    * 0.30 +
        absolute_performance * 0.25 +
        skill_growth         * 0.20 +
        manager_sentiment    * 0.15 +
        peer_percentile      * 0.10,
        2
    )

    feature_vector = {
        'report_count':        len(reports),
        'weeks_tracked':       len(reports),
        'raw_scores_sample':   reports[-4:],   # Last 4 weeks for audit
    }

    return {
        'performance_trend_score':    round(performance_trend, 2),
        'absolute_performance_score': round(absolute_performance, 2),
        'skill_growth_delta':         round(skill_growth, 2),
        'manager_sentiment_trend':    round(manager_sentiment, 2),
        'peer_comparison_percentile': round(peer_percentile, 2),
        'composite_score':            composite,
        'model_version':              'v1.0',
        'feature_vector':             feature_vector,
    }


def _compute_trend_score(scores: list) -> float:
    """
    Fits a linear trend to the list of scores.
    Returns 0–100: 50 = flat, >50 = improving, <50 = declining.
    """
    clean = [s for s in scores if s is not None]
    if len(clean) < 2:
        return 50.0   # Insufficient data — neutral

    n = len(clean)
    x_mean = (n - 1) / 2
    y_mean = sum(clean) / n

    numerator   = sum((i - x_mean) * (y - y_mean) for i, y in enumerate(clean))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return 50.0

    slope = numerator / denominator   # Points per week

    # Map slope to 0–100: slope of +2 → 100, slope of -2 → 0
    mapped = 50.0 + (slope / 2.0) * 50.0
    return max(0.0, min(100.0, mapped))


def _compute_skill_growth(intern) -> float:
    """
    Counts skills at Phase 1 start vs current. Returns 0–100.
    Reads from existing resume parser / SkillGap model.
    """
    try:
        from apps.documents.models import ParsedResume
        resumes = ParsedResume.objects.filter(intern=intern).order_by('created_at')
        if resumes.count() < 2:
            return 50.0   # Only one resume — cannot measure growth
        first_skills = set(resumes.first().skills or [])
        latest_skills = set(resumes.last().skills or [])
        new_skills = len(latest_skills - first_skills)
        # 5+ new skills = 100%, 0 new = 0%
        return min(new_skills / 5.0, 1.0) * 100
    except Exception:
        return 50.0


def _compute_manager_sentiment(intern) -> float:
    """
    Averages sentiment polarity over all manager_comment text in WeeklyReport
    and feedback text in MonthlyEvaluation.
    Returns 0–100 (50 = neutral).
    """
    try:
        from textblob import TextBlob
        from apps.analytics.models import WeeklyReport

        texts = list(WeeklyReport.objects.filter(
            intern=intern,
            manager_comment__gt=''
        ).values_list('manager_comment', flat=True))

        try:
            from apps.assessments.models import MonthlyEvaluation
            texts += list(MonthlyEvaluation.objects.filter(
                intern=intern
            ).values_list('manager_feedback', flat=True))
        except Exception:
            pass

        if not texts:
            return 50.0

        polarities = [TextBlob(t).sentiment.polarity for t in texts if t]
        avg_polarity = sum(polarities) / len(polarities)
        # Map -1..+1 → 0..100
        return round((avg_polarity + 1) / 2 * 100, 2)
    except ImportError:
        return 50.0   # textblob not installed — return neutral


def _compute_peer_percentile(intern, intern_absolute_score: float) -> float:
    """
    Returns the intern's percentile rank (0–100) relative to their cohort.
    Cohort = all active interns with at least 4 weeks of data.
    """
    from django.contrib.auth import get_user_model
    from apps.analytics.models import WeeklyReport

    User = get_user_model()
    cohort_interns = User.objects.filter(
        role='INTERN',
        internprofile__status__in=['ACTIVE_INTERN', 'STIPEND_INTERN']
    ).exclude(pk=intern.pk)

    cohort_scores = []
    for peer in cohort_interns:
        peer_reports = WeeklyReport.objects.filter(
            intern=peer, is_auto_generated=True, overall_weekly_score__isnull=False
        )
        if peer_reports.count() >= 4:
            avg = sum(r.overall_weekly_score for r in peer_reports) / peer_reports.count()
            cohort_scores.append(avg)

    if not cohort_scores:
        return 50.0   # Only intern in cohort — neutral percentile

    below = sum(1 for s in cohort_scores if s < intern_absolute_score)
    return round((below / len(cohort_scores)) * 100, 2)

def _get_skills_summary(intern) -> str:
    """Helper for LLM to get top skills."""
    try:
        from apps.documents.models import ParsedResume
        resume = ParsedResume.objects.filter(intern=intern).order_by('-created_at').first()
        if resume and resume.skills:
            return ", ".join(resume.skills[:5])
    except Exception:
        pass
    return ""

