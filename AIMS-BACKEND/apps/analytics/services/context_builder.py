"""
AI Chatbot Context Builder
===========================
Queries the database for the logged-in user's live data and builds a
role-specific summary string to inject into the LLM system prompt.

Keeps output under ~1500 words to stay within token budget.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Q, Sum

logger = logging.getLogger(__name__)


def get_latest_performance_metrics(intern_ids=None):
    """
    Safely fetches the latest weekly/monthly performance metrics per intern,
    deduplicating in Python to avoid raw DB engine distinct constraints.
    """
    from apps.analytics.models import PerformanceMetrics
    
    queryset = PerformanceMetrics.objects.all()
    if intern_ids is not None:
        queryset = queryset.filter(intern_id__in=intern_ids)
    
    # Order by period_end DESC so that the first record we find for an intern is their latest
    records = queryset.order_by('-period_end')
    
    latest_per_intern = {}
    for r in records:
        if r.intern_id not in latest_per_intern:
            latest_per_intern[r.intern_id] = r
            
    return list(latest_per_intern.values())


def build_user_context(user) -> str:
    """
    Master dispatcher — calls the appropriate builder based on user role.
    Returns a plain-text summary string ready for injection into LLM context.
    """
    role = str(user.role).upper()
    try:
        if role == 'ADMIN':
            return _build_admin_context(user)
        elif role == 'MANAGER':
            return _build_manager_context(user)
        elif role == 'INTERN':
            return _build_intern_context(user)
        else:
            return f"User: {user.full_name}, Role: {role}"
    except Exception as e:
        logger.error(f"Context builder error for {user.email}: {e}")
        return f"User: {user.full_name}, Role: {role}"


# ============================================================================
# INTERN CONTEXT
# ============================================================================

def _build_intern_context(user) -> str:
    from apps.analytics.models import (
        TaskTracking, AttendanceRecord, WeeklyReport,
        PerformanceMetrics, LearningPath
    )
    from apps.projects.models import ProjectAssignment
    from apps.feedback.models import Feedback
    from apps.accounts.models import InternProfile

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    parts = []

    parts.append(f"== LOGGED-IN USER DATA ==")
    parts.append(f"Name: {user.full_name}")
    parts.append(f"Email: {user.email}")
    parts.append(f"Role: INTERN")
    parts.append(f"Department: {user.department or 'Not assigned'}")

    # Profile / career stage
    try:
        profile = InternProfile.objects.get(user=user)
        parts.append(f"Career Stage: {profile.get_status_display()}")
        if profile.join_date:
            parts.append(f"Join Date: {profile.join_date}")
        if profile.assigned_manager:
            parts.append(f"Manager: {profile.assigned_manager.full_name}")
    except InternProfile.DoesNotExist:
        pass

    # Tasks
    tasks = TaskTracking.objects.filter(intern=user)
    total = tasks.count()
    if total > 0:
        status_counts = dict(tasks.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
        parts.append(f"\n-- TASKS ({total} total) --")
        for s in ['COMPLETED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'ASSIGNED', 'REWORK']:
            cnt = status_counts.get(s, 0)
            if cnt > 0:
                parts.append(f"  {s}: {cnt}")

        # Recent tasks (last 5)
        recent = tasks.order_by('-assigned_at')[:5]
        parts.append(f"  Recent tasks:")
        for t in recent:
            parts.append(f"    - {t.title} [{t.status}] (priority: {t.priority})")

        # Overdue tasks
        overdue = tasks.filter(due_date__lt=now).exclude(status__in=['COMPLETED', 'REVIEWED'])
        if overdue.exists():
            parts.append(f"  ⚠ OVERDUE tasks: {overdue.count()}")

    # Attendance (last 30 days)
    attendance = AttendanceRecord.objects.filter(intern=user, date__gte=thirty_days_ago.date())
    att_count = attendance.count()
    if att_count > 0:
        present = attendance.filter(status__in=['PRESENT', 'WORK_FROM_HOME']).count()
        absent = attendance.filter(status='ABSENT').count()
        late = attendance.filter(status='LATE').count()
        avg_hours = attendance.aggregate(avg=Avg('working_hours'))['avg'] or 0
        parts.append(f"\n-- ATTENDANCE (last 30 days) --")
        parts.append(f"  Total records: {att_count}")
        parts.append(f"  Present: {present}, Absent: {absent}, Late: {late}")
        parts.append(f"  Avg working hours/day: {avg_hours:.1f}")

    # Performance (latest)
    perf = PerformanceMetrics.objects.filter(intern=user).order_by('-period_end').first()
    if perf:
        parts.append(f"\n-- LATEST PERFORMANCE --")
        parts.append(f"  Period: {perf.period_start} to {perf.period_end}")
        parts.append(f"  Productivity Score: {perf.productivity_score:.1f}/100")
        parts.append(f"  Quality Score: {perf.quality_score:.1f}/100")
        parts.append(f"  Growth Score: {perf.growth_score:.1f}/100")
        parts.append(f"  Engagement Score: {perf.engagement_score:.1f}/100")
        parts.append(f"  Task Completion Rate: {perf.task_completion_rate:.0%}")
        parts.append(f"  Attendance Rate: {perf.attendance_rate:.0%}")

    # Weekly Reports (last 4)
    reports = WeeklyReport.objects.filter(intern=user).order_by('-week_start_date')[:4]
    if reports.exists():
        parts.append(f"\n-- WEEKLY REPORTS (last 4) --")
        for r in reports:
            status_str = "Submitted" if r.is_submitted else "Draft"
            if r.is_reviewed:
                status_str = "Reviewed"
            parts.append(f"  {r.week_start_date} to {r.week_end_date}: {status_str}")

    # Feedback received (last 5)
    feedbacks = Feedback.objects.filter(recipient=user).order_by('-created_at')[:5]
    if feedbacks.exists():
        parts.append(f"\n-- RECENT FEEDBACK RECEIVED --")
        for f in feedbacks:
            rating_str = f"rating {f.rating}/5" if f.rating else "no rating"
            parts.append(f"  From {f.reviewer.full_name}: {rating_str} ({f.feedback_type})")

    # Projects
    assignments = ProjectAssignment.objects.filter(intern=user).select_related('project')
    if assignments.exists():
        parts.append(f"\n-- ASSIGNED PROJECTS --")
        for a in assignments:
            parts.append(f"  - {a.project.name} [{a.project.status}] (role: {a.role or 'N/A'})")

    # Learning paths
    paths = LearningPath.objects.filter(intern=user)
    if paths.exists():
        parts.append(f"\n-- LEARNING PATHS --")
        for lp in paths:
            parts.append(f"  - {lp.title}: {lp.progress_percentage:.0f}% complete")

    return "\n".join(parts)


# ============================================================================
# MANAGER CONTEXT
# ============================================================================

def _build_manager_context(user) -> str:
    from apps.analytics.models import (
        TaskTracking, PerformanceMetrics, WeeklyReport
    )
    from apps.projects.models import Project
    from apps.feedback.models import Feedback
    from apps.accounts.models import InternProfile, User as UserModel, StipendRecord

    now = timezone.now()
    parts = []

    parts.append(f"== LOGGED-IN USER DATA ==")
    parts.append(f"Name: {user.full_name}")
    parts.append(f"Email: {user.email}")
    parts.append(f"Role: MANAGER (Admin)")
    parts.append(f"Department: {user.department or 'Not assigned'}")

    # My interns
    managed_profiles = InternProfile.objects.filter(assigned_manager=user).select_related('user')
    intern_ids = [p.user_id for p in managed_profiles]
    intern_count = len(intern_ids)

    parts.append(f"\n-- MY TEAM ({intern_count} interns) --")
    for p in managed_profiles[:15]:
        parts.append(f"  - {p.user.full_name} [{p.get_status_display()}]")

    if intern_count > 0:
        # Team task summary
        team_tasks = TaskTracking.objects.filter(intern_id__in=intern_ids)
        total_tasks = team_tasks.count()
        if total_tasks > 0:
            status_counts = dict(
                team_tasks.values('status').annotate(c=Count('id')).values_list('status', 'c')
            )
            parts.append(f"\n-- TEAM TASKS ({total_tasks} total) --")
            for s in ['COMPLETED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'ASSIGNED', 'REWORK']:
                cnt = status_counts.get(s, 0)
                if cnt > 0:
                    parts.append(f"  {s}: {cnt}")

            # Overdue
            overdue = team_tasks.filter(due_date__lt=now).exclude(status__in=['COMPLETED', 'REVIEWED'])
            if overdue.exists():
                parts.append(f"  ⚠ Overdue tasks: {overdue.count()}")

        # Team performance (latest per intern, top 5 + bottom 5)
        perf_list = get_latest_performance_metrics(intern_ids=intern_ids)

        if perf_list:
            perf_list.sort(key=lambda p: p.productivity_score, reverse=True)
            parts.append(f"\n-- TEAM PERFORMANCE RANKING --")
            for rank, p in enumerate(perf_list[:10], 1):
                parts.append(
                    f"  {rank}. {p.intern.full_name}: "
                    f"Productivity {p.productivity_score:.0f}, "
                    f"Quality {p.quality_score:.0f}, "
                    f"Growth {p.growth_score:.0f}"
                )

        # Pending weekly reports
        pending_reports = WeeklyReport.objects.filter(
            intern_id__in=intern_ids, is_submitted=True, is_reviewed=False
        ).count()
        if pending_reports:
            parts.append(f"\n-- PENDING REVIEWS --")
            parts.append(f"  Weekly reports awaiting review: {pending_reports}")

    # Projects I mentor
    my_projects = Project.objects.filter(mentor=user)
    if my_projects.exists():
        parts.append(f"\n-- MY PROJECTS ({my_projects.count()}) --")
        for proj in my_projects[:10]:
            parts.append(f"  - {proj.name} [{proj.status}]")

    # Feedback I gave (last 5)
    my_feedback = Feedback.objects.filter(reviewer=user).order_by('-created_at')[:5]
    if my_feedback.exists():
        parts.append(f"\n-- RECENT FEEDBACK GIVEN --")
        for f in my_feedback:
            rating_str = f"rated {f.rating}/5" if f.rating else "no rating"
            parts.append(f"  To {f.recipient.full_name}: {rating_str} ({f.feedback_type})")

    # Pending stipends
    try:
        pending_stipends = StipendRecord.objects.filter(
            intern_id__in=intern_ids, status='PENDING'
        ).count()
        if pending_stipends:
            parts.append(f"\n-- PENDING STIPEND APPROVALS: {pending_stipends} --")
    except Exception:
        pass

    return "\n".join(parts)


# ============================================================================
# ADMIN (SUPER ADMIN) CONTEXT
# ============================================================================

def _build_admin_context(user) -> str:
    from apps.analytics.models import (
        TaskTracking, PerformanceMetrics, WeeklyReport,
        AttendanceRecord, CertificationRecord
    )
    from apps.projects.models import Project
    from apps.feedback.models import Feedback
    from apps.accounts.models import User as UserModel, InternProfile, StipendRecord, FullTimeOffer

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    parts = []

    parts.append(f"== LOGGED-IN USER DATA ==")
    parts.append(f"Name: {user.full_name}")
    parts.append(f"Email: {user.email}")
    parts.append(f"Role: ADMIN (Super Admin)")

    # Platform overview
    total_users = UserModel.objects.filter(is_active=True).count()
    total_interns = UserModel.objects.filter(role='INTERN', is_active=True).count()
    total_managers = UserModel.objects.filter(role='MANAGER', is_active=True).count()
    total_admins = UserModel.objects.filter(role='ADMIN', is_active=True).count()

    parts.append(f"\n-- PLATFORM OVERVIEW --")
    parts.append(f"  Total active users: {total_users}")
    parts.append(f"  Interns: {total_interns}, Managers: {total_managers}, Admins: {total_admins}")

    # Intern career stage distribution
    stage_dist = dict(
        InternProfile.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
    )
    if stage_dist:
        parts.append(f"\n-- INTERN CAREER STAGES --")
        for stage, count in stage_dist.items():
            parts.append(f"  {stage}: {count}")

    # Tasks platform-wide
    all_tasks = TaskTracking.objects.all()
    total_tasks = all_tasks.count()
    if total_tasks > 0:
        status_counts = dict(
            all_tasks.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )
        parts.append(f"\n-- ALL TASKS ({total_tasks} total) --")
        for s in ['COMPLETED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'ASSIGNED', 'REWORK']:
            cnt = status_counts.get(s, 0)
            if cnt > 0:
                parts.append(f"  {s}: {cnt}")

        overdue = all_tasks.filter(due_date__lt=now).exclude(status__in=['COMPLETED', 'REVIEWED']).count()
        if overdue:
            parts.append(f"  ⚠ Overdue: {overdue}")

    # Projects
    projects = Project.objects.all()
    project_count = projects.count()
    if project_count > 0:
        proj_status = dict(
            projects.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )
        parts.append(f"\n-- PROJECTS ({project_count} total) --")
        for s, c in proj_status.items():
            parts.append(f"  {s}: {c}")

    # Attendance summary (last 30 days)
    att_recent = AttendanceRecord.objects.filter(date__gte=thirty_days_ago.date())
    if att_recent.exists():
        total_records = att_recent.count()
        present = att_recent.filter(status__in=['PRESENT', 'WORK_FROM_HOME']).count()
        absent = att_recent.filter(status='ABSENT').count()
        rate = (present / total_records * 100) if total_records > 0 else 0
        parts.append(f"\n-- ATTENDANCE (last 30 days) --")
        parts.append(f"  Records: {total_records}, Present: {present}, Absent: {absent}")
        parts.append(f"  Overall attendance rate: {rate:.1f}%")

    # Top 5 performers
    perf_list = get_latest_performance_metrics()
    if perf_list:
        perf_list.sort(key=lambda p: p.productivity_score, reverse=True)
        parts.append(f"\n-- TOP 5 PERFORMERS --")
        for rank, p in enumerate(perf_list[:5], 1):
            parts.append(
                f"  {rank}. {p.intern.full_name}: "
                f"Productivity {p.productivity_score:.0f}/100"
            )

    # Pending actions
    pending_reports = WeeklyReport.objects.filter(is_submitted=True, is_reviewed=False).count()
    parts.append(f"\n-- PENDING ADMIN ACTIONS --")
    parts.append(f"  Weekly reports awaiting review: {pending_reports}")

    try:
        pending_stipends = StipendRecord.objects.filter(status='PENDING').count()
        parts.append(f"  Stipends awaiting approval: {pending_stipends}")
    except Exception:
        pass

    try:
        pending_offers = FullTimeOffer.objects.filter(status='DRAFT').count()
        parts.append(f"  Draft FT offers: {pending_offers}")
    except Exception:
        pass

    # Certificates issued
    try:
        cert_count = CertificationRecord.objects.count()
        parts.append(f"  Certificates issued: {cert_count}")
    except Exception:
        pass

    return "\n".join(parts)
