import io
import base64
import logging
from datetime import date
import uuid

from celery import shared_task
from django.template.loader import render_to_string
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.utils import timezone

import qrcode
# from weasyprint import HTML  # Moved to inside generate_certificate_pdf

from django.core.cache import cache
from apps.analytics.models import PhaseEvaluation, CertificationRecord, CertificationCriteria, WeeklyReportV2

REPORT_LOCK_TTL = 300   # 5 minutes
from apps.analytics.services.certification_service import get_aggregated_scores, evaluate_criteria
from apps.analytics.services.weekly_report_service_v2 import (
    compute_weekly_metrics_v2,
    check_red_flags_v2,
    check_consecutive_red_flags_v2,
    detect_mismatch_v2
)

logger = logging.getLogger(__name__)

@shared_task(name='apps.analytics.tasks.run_criteria_evaluation')
def run_criteria_evaluation(evaluation_id):
    """
    Main orchestrator for the certification gate.
    1. Aggregates data
    2. Evaluates against active criteria
    3. Generates CertificationRecord if passed
    4. Triggers PDF generation
    """
    try:
        evaluation = PhaseEvaluation.objects.get(pk=evaluation_id)
        intern = evaluation.intern
        stage = evaluation.employment_stage
        
        # Get active criteria for this phase
        # Mapping: FULL_TIME employment stage corresponds to PPO certificate criteria
        lookup_phase = stage.phase
        if lookup_phase == 'FULL_TIME':
            lookup_phase = 'PPO'

        criteria = CertificationCriteria.objects.filter(
            phase=lookup_phase,
            is_active=True
        ).first()
        
        if not criteria:
            logger.error(f"No active criteria found for phase {lookup_phase}")
            return False

        # Aggregate scores (from stage start to now)
        scores = get_aggregated_scores(intern, stage.phase_start_date, date.today())
        
        # Evaluate
        result = evaluate_criteria(scores, criteria)
        
        # Update Evaluation record with snapshot results
        evaluation.overall_score = scores['overall_score']
        evaluation.productivity_score = scores['productivity_score']
        evaluation.quality_score = scores['quality_score']
        evaluation.engagement_score = scores['engagement_score']
        evaluation.attendance_pct = scores['attendance_pct']
        evaluation.weekly_reports_submitted = scores['weekly_reports_submitted']
        evaluation.criteria_snapshot = result['criteria_used']
        evaluation.criteria_met = result['passed']
        evaluation.save()

        if result['passed']:
            # Issue the certificate
            cert = CertificationRecord.objects.create(
                intern=intern,
                phase_evaluation=evaluation,
                cert_type=lookup_phase,
                overall_score_at_issue=scores['overall_score'],
                scores_snapshot=scores,
                criteria_snapshot=result['criteria_used']
            )
            # Trigger PDF generation
            generate_certificate_pdf.delay(cert.id)
            return True
        else:
            logger.info(f"Intern {intern.email} failed criteria for {stage.phase}")
            return False

    except Exception as e:
        logger.error(f"Error in run_criteria_evaluation: {str(e)}")
        return False

@shared_task(name='apps.analytics.tasks.generate_certificate_pdf')
def generate_certificate_pdf(cert_id):
    """
    Renders the certificate template to PDF using WeasyPrint.
    Embeds a QR code linking to the public verification endpoint.
    """
    try:
        cert = CertificationRecord.objects.get(pk=cert_id)
        
        # 1. Generate QR Code
        verify_url = f"{settings.FRONTEND_BASE_URL}/verify/{cert.unique_cert_id}/"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(verify_url)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()

        # 2. Render HTML
        context = {
            'cert': cert,
            'intern_full_name': cert.intern.full_name,
            'cert_type_display': cert.get_cert_type_display(),
            'issue_date': cert.issue_date.strftime('%B %d, %Y'),
            'qr_code_base64': qr_base64,
            'company_name': settings.COMPANY_NAME,
        }
        
        html_string = render_to_string('certificates/certificate.html', context)
        
        # 3. Convert to PDF using ReportLab (more robust on Windows/no GTK needed)
        try:
            from apps.analytics.services.pdf_service import generate_certificate_reportlab
            pdf_content = generate_certificate_reportlab(cert)
        except Exception as e:
            logger.error(f"ReportLab generation failed: {str(e)}")
            # Try WeasyPrint as second fallback if available
            try:
                from weasyprint import HTML
                pdf_buffer = io.BytesIO()
                HTML(string=html_string, base_url=settings.WEASYPRINT_BASEURL).write_pdf(pdf_buffer)
                pdf_content = pdf_buffer.getvalue()
            except Exception as e2:
                logger.error(f"WeasyPrint also failed: {str(e2)}")
                return

        # 4. Save to FileField
        filename = f"cert_{cert.intern.id}_{cert.cert_type}_{cert.issue_date}.pdf"
        cert.certificate_file.save(filename, ContentFile(pdf_content))
        cert.save()

        # 5. Trigger Email
        send_certificate_email.delay(cert.id)
        
    except Exception as e:
        logger.error(f"Error generating certificate PDF: {str(e)}")

@shared_task(name='apps.analytics.tasks.send_certificate_email')
def send_certificate_email(cert_id):
    """Sends the generated certificate PDF to the intern."""
    try:
        cert = CertificationRecord.objects.get(pk=cert_id)
        intern = cert.intern
        
        subject = f"Congratulations! Your {cert.get_cert_type_display()} is ready"
        message = (
            f"Dear {intern.full_name},\n\n"
            f"Congratulations on successfully completing your {cert.get_cert_type_display()} evaluation!\n"
            f"Please find your certificate attached to this email.\n\n"
            f"You can also verify your certificate online at: "
            f"{settings.FRONTEND_BASE_URL}/verify/{cert.unique_cert_id}/\n\n"
            f"Best regards,\n"
            f"{settings.COMPANY_NAME} Team"
        )
        
        email = EmailMessage(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [intern.email]
        )
        
        if cert.certificate_file:
            email.attach_file(cert.certificate_file.path)
            
        email.send()
        
    except Exception as e:
        logger.error(f"Error sending certificate email: {str(e)}")


# ==============================================================================
# PHASE 5 STUBS (Implemented in Sprint 5)
# ==============================================================================

@shared_task(name='apps.analytics.tasks.update_all_conversion_scores')
def update_all_conversion_scores():
    """
    Celery Beat — every Monday 9:00 AM (after weekly reports are generated at 8am).
    Computes / updates ConversionScore for every Phase 2+ intern.
    """
    from apps.accounts.models import User
    from apps.analytics.models import ConversionScore
    from apps.analytics.services import compute_conversion_score

    eligible_interns = User.objects.filter(
        role='INTERN',
        internprofile__status__in=['STIPEND_INTERN', 'PHASE_2_COMPLETE', 'PPO_OFFERED']
    ).distinct()

    updated = 0
    for intern in eligible_interns:
        try:
            score_data = compute_conversion_score(intern)
            ConversionScore.objects.update_or_create(
                intern=intern,
                defaults=score_data,
            )
            updated += 1
        except Exception as exc:
            logger.error(f"ConversionScore update failed for {intern.email}: {exc}")

    logger.info(f"update_all_conversion_scores: updated {updated} interns.")
    return {'updated': updated}


ONBOARDING_PLAN_PROMPT = """\
You are an HR specialist generating a personalised onboarding plan for a new full-time employee.
Base your response ONLY on the data provided below.

EMPLOYEE PROFILE:
- Name: {intern_name}
- Recommended role: {role_title}
- Department: {department}
- 12-Month internship overall score: {overall_score}%
- Top skills demonstrated: {top_skills}
- Areas needing development: {growth_areas}
- Average task quality rating over internship: {avg_quality}/5
- Attendance reliability: {attendance_pct}%

Generate:
1. A 2-sentence offer rationale explaining why this person deserves a full-time offer.
2. A 30-60-90 day onboarding plan (3 short bullet points per phase).

Return ONLY valid JSON — no markdown, no extra text:
{{
  "offer_summary": "...",
  "onboarding_plan": {{
    "day_30": ["...", "...", "..."],
    "day_60": ["...", "...", "..."],
    "day_90": ["...", "...", "..."]
  }}
}}
"""


@shared_task(name='apps.analytics.tasks.generate_onboarding_plan', bind=True, max_retries=2, default_retry_delay=60)
def generate_onboarding_plan(self, offer_id: int):
    """
    Called when a FullTimeOffer is created.
    Generates ai_offer_summary and ai_onboarding_plan via Groq LLM.
    """
    import json
    from django.conf import settings
    from apps.accounts.models import FullTimeOffer
    from apps.analytics.services import _get_skills_summary

    try:
        offer = FullTimeOffer.objects.select_related(
            'intern', 'conversion_score'
        ).get(pk=offer_id)
    except FullTimeOffer.DoesNotExist:
        return

    cs   = offer.conversion_score
    intern = offer.intern

    top_skills   = _get_skills_summary(intern)
    growth_areas = _get_growth_areas(intern)

    prompt = ONBOARDING_PLAN_PROMPT.format(
        intern_name   = intern.full_name or intern.email,
        role_title    = offer.recommended_role_title or 'Software Engineer',
        department    = offer.recommended_department or 'Engineering',
        overall_score = cs.composite_score,
        top_skills    = top_skills or 'Python, Django, React',
        growth_areas  = growth_areas or 'Team communication, documentation',
        avg_quality   = round(cs.absolute_performance_score / 20, 1),   # Approximate /5 scale
        attendance_pct = cs.feature_vector.get('avg_attendance_pct', 'N/A'),
    )

    try:
        from groq import Groq
        client   = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model       = settings.GROQ_MODEL,
            messages    = [{'role': 'user', 'content': prompt}],
            max_tokens  = 600,
            temperature = 0.4,
        )
        raw = response.choices[0].message.content.strip()
        # Clean markdown if LLM includes it
        if raw.startswith('```'):
            raw = raw.strip('```json').strip('```').strip()
        data = json.loads(raw)
    except Exception as exc:
        logger.error(f"generate_onboarding_plan failed for offer {offer_id}: {exc}")
        raise self.retry(exc=exc)

    # Flatten onboarding_plan dict to formatted text
    plan = data.get('onboarding_plan', {})
    plan_text = (
        "FIRST 30 DAYS:\n"  + '\n'.join(f'• {b}' for b in plan.get('day_30', [])) + '\n\n'
        "DAYS 31–60:\n"    + '\n'.join(f'• {b}' for b in plan.get('day_60', [])) + '\n\n'
        "DAYS 61–90:\n"    + '\n'.join(f'• {b}' for b in plan.get('day_90', []))
    )

    FullTimeOffer.objects.filter(pk=offer_id).update(
        ai_offer_summary   = data.get('offer_summary', ''),
        ai_onboarding_plan = plan_text,
    )

    logger.info(f"Onboarding plan generated for offer {offer_id}.")


def _get_growth_areas(intern) -> str:
    """Returns areas where the intern's scores were lowest, for LLM context."""
    from apps.analytics.models import WeeklyReportV2
    from django.db.models import Avg

    agg = WeeklyReportV2.objects.filter(
        intern=intern, is_auto_generated=True
    ).aggregate(
        avg_prod = Avg('productivity_score'),
        avg_qual = Avg('quality_score'),
        avg_eng  = Avg('engagement_score'),
    )

    areas = []
    if (agg['avg_prod'] or 0) < 70:
        areas.append('task delivery speed')
    if (agg['avg_qual'] or 0) < 70:
        areas.append('output quality')
    if (agg['avg_eng'] or 0) < 70:
        areas.append('team engagement')

    return ', '.join(areas) if areas else 'no critical gaps identified'

@shared_task(name='apps.analytics.tasks.check_phase_transition_eligibility')
def check_phase_transition_eligibility():
    """Stub — checks if any intern has reached their 6/12-month gate."""
    pass


# ==============================================================================
# PHASE 3 — WEEKLY REPORT ENGINE V2 TASKS
# ==============================================================================

@shared_task(name='apps.analytics.tasks.generate_weekly_reports_v2')
def generate_weekly_reports_v2():
    """
    Celery Beat entry point — runs every Monday at 8:00 AM.
    Fans out one generate_single_report_v2 task per active intern.
    """
    from apps.accounts.models import User
    from datetime import date, timedelta

    today      = date.today()
    week_end   = today - timedelta(days=1)     # Yesterday = Sunday
    week_start = week_end - timedelta(days=6)  # The Monday before Sunday

    active_interns = User.objects.filter(
        role='INTERN',
        internprofile__status__in=['ACTIVE_INTERN', 'STIPEND_INTERN']
    ).distinct()

    count = 0
    for intern in active_interns:
        generate_single_report_v2.delay(intern.id, str(week_start), str(week_end))
        count += 1

    logger.info(f"generate_weekly_reports_v2 dispatched {count} sub-tasks for week {week_start} -> {week_end}.")
    return {'dispatched': count, 'week_start': str(week_start), 'week_end': str(week_end)}


@shared_task(name='apps.analytics.tasks.generate_single_report_v2', bind=True, max_retries=3, default_retry_delay=300)
def generate_single_report_v2(self, intern_id: int, week_start_str: str, week_end_str: str):
    """
    Builds a complete WeeklyReportV2 for one intern for one week.
    Uses a distributed lock to prevent concurrent execution.
    """
    from datetime import datetime
    from apps.accounts.models import User
    from apps.analytics.models import WeeklyReportV2, TaskTracking, AttendanceRecord

    # ── Distributed lock (Redis) ───────────────────────────────────────────────
    lock_key = f"report_lock:intern_{intern_id}:week_{week_start_str}"
    lock_acquired = cache.add(lock_key, '1', timeout=REPORT_LOCK_TTL)
    if not lock_acquired:
        logger.warning(
            f"generate_single_report_v2: lock held for intern {intern_id} week {week_start_str} — skipping duplicate."
        )
        return {'skipped': True, 'reason': 'duplicate_task'}

    try:
        week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
        week_end   = datetime.strptime(week_end_str,   '%Y-%m-%d').date()

        try:
            intern = User.objects.get(pk=intern_id)
        except User.DoesNotExist:
            logger.error(f"generate_single_report_v2: intern {intern_id} not found.")
            return

        # Idempotency check
        if WeeklyReportV2.objects.filter(intern=intern, week_start=week_start, is_auto_generated=True).exists():
            logger.info(f"Report already exists for intern {intern_id} week {week_start} — skipping.")
            return

        # 1. Fetch data
        tasks_qs = TaskTracking.objects.filter(
            intern=intern,
            assigned_at__range=[week_start, week_end]
        )
        attendance_qs = AttendanceRecord.objects.filter(
            intern=intern,
            date__range=[week_start, week_end]
        )

        # 2. Prior week report
        prior = WeeklyReportV2.objects.filter(
            intern=intern,
            is_auto_generated=True
        ).order_by('-week_start').first()

        # 3. Compute week number
        week_number = _compute_week_number_v2(intern, week_start)

        # 4. Compute metrics
        try:
            metrics = compute_weekly_metrics_v2(tasks_qs, attendance_qs, prior)
        except Exception as exc:
            logger.error(f"compute_weekly_metrics_v2 failed for intern {intern_id}: {exc}")
            raise self.retry(exc=exc)

        # 5. Red flags
        flags = check_red_flags_v2(metrics)

        # 6. Self-report mismatch
        self_report = WeeklyReportV2.objects.filter(
            intern=intern,
            week_start=week_start,
            is_auto_generated=False
        ).first()

        mismatch_detected  = False
        mismatch_details   = []
        if self_report:
            mismatch_detected, mismatch_details = detect_mismatch_v2(metrics, self_report)

        # 7. Compute cumulative
        cumulative = _compute_cumulative_score_v2(intern, week_start, metrics['overall_weekly_score'])

        # 8. Save WeeklyReportV2
        report = WeeklyReportV2.objects.create(
            intern            = intern,
            week_start        = week_start,
            week_end          = week_end,
            week_number       = week_number,
            is_auto_generated = True,
            **metrics,
            cumulative_overall_score     = cumulative,
            red_flag                     = bool(flags),
            red_flag_reasons             = flags,
            intern_self_report           = self_report,
            self_report_mismatch         = mismatch_detected,
            self_report_mismatch_details = mismatch_details,
        )

        # 9. Async sub-tasks
        generate_week_narrative_v2.delay(report.id)
        notify_manager_new_report_v2.delay(report.id)

        if bool(flags):
            consecutive = check_consecutive_red_flags_v2(intern)
            if consecutive >= 2:
                escalate_red_flag_to_admin_v2.delay(intern.id, report.id)

        return {'report_id': report.id, 'red_flag': bool(flags)}
    finally:
        cache.delete(lock_key)


def _compute_week_number_v2(intern, week_start) -> int:
    from apps.analytics.models import EmploymentStage
    try:
        stage = EmploymentStage.objects.filter(
            intern=intern,
            phase_end_date__isnull=True
        ).latest('phase_start_date')
        delta = (week_start - stage.phase_start_date).days
        return max(1, (delta // 7) + 1)
    except Exception:
        return 1

def _compute_cumulative_score_v2(intern, week_start, this_week_score) -> float:
    from apps.analytics.models import WeeklyReportV2
    prior_scores = list(WeeklyReportV2.objects.filter(
        intern=intern,
        is_auto_generated=True,
        week_start__lt=week_start,
        overall_weekly_score__isnull=False
    ).values_list('overall_weekly_score', flat=True))
    all_scores = prior_scores + [this_week_score]
    return round(sum(all_scores) / len(all_scores), 2)


# ── Step 9: LLM Narrative Generation (Groq) ───────────────────────────────────

WEEKLY_NARRATIVE_PROMPT = """\
You are generating a weekly performance summary for a manager to review.
Base your response ONLY on the data provided below. Do not speculate, do not invent facts.
Keep the tone factual and constructive.

INTERN DATA FOR WEEK {week_start} to {week_end}:
- Tasks assigned: {tasks_assigned}, completed: {tasks_completed}, overdue: {tasks_overdue}
- Task Titles Worked On: {task_titles}
- Avg task quality rating: {avg_task_quality_rating}/5
- Attendance: {attendance_days}/{expected_days} days, {late_check_ins} late check-ins
- Productivity score: {productivity_score}% (delta vs last week: {productivity_delta})
- Quality score: {quality_score}%
- Cumulative phase score to date: {cumulative_overall_score}%

Instructions:
1. Narrative: Exactly 3 sentences. (Achievement, concern/consistency, growth observation).
2. Work Summary: A brief, professional summary (1-2 sentences) of the work done based on the task titles.
3. Quote: A short, powerful, professional/motivational quote or leadership insight that matches the week's performance.

Return ONLY valid JSON with no extra text:
{{"narrative": "...", "work_summary": "...", "quote": "...", "top_achievement": "...", "concern_area": "...", "growth_note": "..."}}
"""

@shared_task(name='apps.analytics.tasks.generate_week_narrative_v2', bind=True, max_retries=2, default_retry_delay=60)
def generate_week_narrative_v2(self, report_id: int):
    import json
    import os
    from django.conf import settings
    from apps.analytics.models import WeeklyReportV2

    try:
        report = WeeklyReportV2.objects.get(pk=report_id)
    except WeeklyReportV2.DoesNotExist:
        return

    # Check for available AI providers
    github_token = os.environ.get("AI_TALENT_GITHUB_TOKEN") or getattr(settings, "AI_TALENT_GITHUB_TOKEN", None)
    groq_api_key = os.environ.get("GROQ_API_KEY") or getattr(settings, "GROQ_API_KEY", None)

    if not github_token and not groq_api_key:
        logger.warning("No AI API keys (GitHub/Groq) found — skipping narrative generation.")
        return

    # Fetch task titles for context
    from apps.analytics.models import TaskTracking
    task_titles = list(TaskTracking.objects.filter(
        intern=report.intern,
        assigned_at__range=[report.week_start, report.week_end]
    ).values_list('title', flat=True))
    task_titles_str = ", ".join(task_titles) if task_titles else "No specific tasks recorded"

    prompt = WEEKLY_NARRATIVE_PROMPT.format(
        week_start              = report.week_start,
        week_end                = report.week_end,
        tasks_assigned          = report.tasks_assigned,
        tasks_completed         = report.tasks_completed,
        tasks_overdue           = report.tasks_overdue,
        task_titles             = task_titles_str,
        avg_task_quality_rating = report.avg_task_quality_rating or 'N/A',
        attendance_days         = report.attendance_days,
        expected_days           = report.expected_days,
        late_check_ins          = report.late_check_ins,
        productivity_score      = report.productivity_score or 0,
        productivity_delta      = f"{report.productivity_delta:+.1f}%" if report.productivity_delta is not None else "N/A",
        quality_score           = report.quality_score or 'N/A',
        cumulative_overall_score = report.cumulative_overall_score or 0,
    )

    narrative_json = None

    # Priority 1: GitHub Models (GPT-4o mini)
    if github_token:
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import HumanMessage
            
            llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.3,
                max_tokens=400,
                api_key=github_token,
                base_url="https://models.inference.ai.azure.com"
            )
            
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content.strip()
            
            # Clean markdown code blocks if present
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            
            narrative_json = json.loads(content)
            logger.info(f"Narrative generated using GitHub Models (GPT-4o mini) for report {report_id}")
        except Exception as e:
            logger.error(f"GitHub Models narrative generation failed for report {report_id}: {e}")

    # Priority 2: Groq (Fallback)
    if not narrative_json and groq_api_key:
        try:
            from groq import Groq
            client   = Groq(api_key=groq_api_key)
            response = client.chat.completions.create(
                model    = getattr(settings, "GROQ_MODEL", "llama3-8b-8192"),
                messages = [{'role': 'user', 'content': prompt}],
                max_tokens    = 400,
                temperature   = 0.3,
            )
            narrative_json = json.loads(response.choices[0].message.content)
            logger.info(f"Narrative generated using Groq for report {report_id}")
        except Exception as e:
            logger.error(f"Groq narrative generation failed for report {report_id}: {e}")

    # Save results if successful
    if narrative_json:
        WeeklyReportV2.objects.filter(pk=report_id).update(
            ai_narrative       = narrative_json.get('narrative', ''),
            ai_work_summary    = narrative_json.get('work_summary', ''),
            ai_quote           = narrative_json.get('quote', ''),
            ai_top_achievement = narrative_json.get('top_achievement', ''),
            ai_concern_area    = narrative_json.get('concern_area', ''),
            ai_growth_note     = narrative_json.get('growth_note', ''),
        )
    else:
        logger.error(f"Failed all AI narrative generation attempts for report {report_id}")
        WeeklyReportV2.objects.filter(pk=report_id, ai_narrative='').update(
            ai_narrative='[AI summary unavailable — the narrative service was temporarily unreachable. Metrics above are accurate.]'
        )


# ── Step 10: Manager Notifications ───────────────────────────────────────────

@shared_task(name='apps.analytics.tasks.notify_manager_new_report_v2')
def notify_manager_new_report_v2(report_id: int):
    from apps.analytics.models import WeeklyReportV2
    from apps.notifications.models import Notification

    try:
        report = WeeklyReportV2.objects.select_related('intern', 'intern__internprofile').get(pk=report_id)
        manager = getattr(report.intern.internprofile, 'assigned_manager', None)
        
        if not manager:
            return

        Notification.objects.create(
            user       = manager,
            title      = "New Weekly Report Ready",
            message    = (
                f"{'🚨 RED FLAG — ' if report.red_flag else ''}"
                f"Weekly report for {report.intern.get_full_name() or report.intern.username} "
                f"(Week {report.week_number}) is ready. Score: {report.overall_weekly_score:.1f}%."
            ),
            notification_type = 'REPORT_UPLOADED',
        )
    except Exception as e:
        logger.error(f"Failed to notify manager: {e}")


@shared_task(name='apps.analytics.tasks.escalate_red_flag_to_admin_v2')
def escalate_red_flag_to_admin_v2(intern_id: int, report_id: int):
    from apps.accounts.models import User
    from apps.analytics.models import WeeklyReportV2
    from apps.notifications.models import Notification

    try:
        intern  = User.objects.get(pk=intern_id)
        report  = WeeklyReportV2.objects.get(pk=report_id)
        admins = User.objects.filter(role='ADMIN')
        
        for admin in admins:
            Notification.objects.create(
                user       = admin,
                title      = "Red Flag Escalation",
                message    = (
                    f"🚨 ESCALATION: {intern.get_full_name() or intern.username} has had "
                    f"2 consecutive red-flagged weeks. Latest score {report.overall_weekly_score:.1f}%."
                ),
                notification_type = 'ENGAGEMENT_RISK',
            )
    except Exception as e:
        logger.error(f"Failed to escalate red flag: {e}")


# ── Step 11: Weekly Batch Email Reports ──────────────────────────────────────

@shared_task(name='apps.analytics.tasks.send_weekly_intern_performance_emails')
def send_weekly_intern_performance_emails():
    """
    Sends personalized weekly reports to every active intern.
    Uses a batch SMTP connection for efficiency.
    """
    from apps.accounts.models import User
    from apps.analytics.models import WeeklyReportV2, EmploymentStage, TaskTracking
    from django.core.mail import get_connection, EmailMultiAlternatives
    from datetime import timedelta
    from django.utils import timezone

    today = timezone.now().date()
    # Assume reports for the previous week (Mon-Sun)
    last_week_start = today - timedelta(days=7)
    
    interns = User.objects.filter(role='INTERN', is_active=True)
    messages = []
    notifications_to_create = []

    for intern in interns:
        try:
            # Get latest report from last week
            report = WeeklyReportV2.objects.filter(
                intern=intern, 
                week_start__gte=last_week_start
            ).order_by('-created_at').first()
            
            if not report:
                continue

            # Fetch tasks for this week
            weekly_tasks = TaskTracking.objects.filter(
                intern=intern,
                assigned_at__date__gte=report.week_start,
                assigned_at__date__lte=report.week_end
            ).order_by('-status', '-priority')[:10]  # Limit to top 10

            task_list = []
            for t in weekly_tasks:
                status = t.get_status_display()
                color_class = 'status-default'
                if status == 'Completed':
                    color_class = 'status-completed'
                elif status == 'In Progress':
                    color_class = 'status-in-progress'
                
                task_list.append({
                    'title': t.title,
                    'status': status,
                    'priority': t.get_priority_display(),
                    'color_class': color_class
                })

            # Check promotion milestone
            current_stage = EmploymentStage.objects.filter(
                intern=intern, 
                phase_end_date__isnull=False
            ).order_by('-phase_start_date').first()
            
            show_promotion = False
            phase_name = ""
            phase_end = ""
            
            if current_stage:
                days_to_end = (current_stage.phase_end_date - today).days
                if 0 <= days_to_end <= 14:
                    show_promotion = True
                    phase_name = current_stage.get_phase_display()
                    phase_end = current_stage.phase_end_date.strftime('%b %d, %Y')

            context = {
                'intern_email': intern.email,
                'week_dates': f"{report.week_start} to {report.week_end}",
                'overall_score': round(report.overall_weekly_score, 1),
                'productivity_score': round(report.productivity_score, 1),
                'quality_score': round(report.quality_score, 1),
                'attendance_pct': round(report.attendance_pct, 1),
                'ai_narrative': report.ai_narrative,
                'tasks_completed': report.tasks_completed,
                'tasks_assigned': report.tasks_assigned,
                'task_list': task_list,
                'show_promotion_indicator': show_promotion,
                'phase_name': phase_name,
                'phase_end_date': phase_end,
                'timeline_url': f"{settings.FRONTEND_URL}/career/phase-timeline" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:5173/career/phase-timeline"
            }

            html_content = render_to_string('emails/weekly_performance_report.html', context)
            
            msg = EmailMultiAlternatives(
                subject=f"Weekly Performance Insight — {intern.get_full_name() or intern.username}",
                body=f"Your weekly performance score is {context['overall_score']}%",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[intern.email]
            )
            msg.attach_alternative(html_content, "text/html")
            messages.append(msg)
            
            # Prepare notification
            from apps.notifications.models import Notification
            notifications_to_create.append(
                Notification(
                    user=intern,
                    notification_type='SYSTEM',
                    title="Weekly Performance Report Available",
                    message=f"Your weekly performance report for {report.week_start} to {report.week_end} is now available.",
                    link=context['timeline_url']
                )
            )
            
        except Exception as e:
            logger.error(f"Error preparing weekly email for {intern.email}: {e}")

    if messages:
        try:
            connection = get_connection()
            connection.send_messages(messages)
            logger.info(f"Successfully sent {len(messages)} weekly intern reports.")
            
            # Create in-app notifications
            if notifications_to_create:
                from apps.notifications.models import Notification
                Notification.objects.bulk_create(notifications_to_create)
                
        except Exception as e:
            logger.error(f"Failed to send batch intern emails: {e}")


@shared_task(name='apps.analytics.tasks.send_weekly_manager_summary_emails')
def send_weekly_manager_summary_emails():
    """
    Sends aggregated team reports to all Managers and Admins.
    """
    from apps.accounts.models import User, InternProfile
    from apps.analytics.models import WeeklyReportV2, TaskTracking
    from django.core.mail import get_connection, EmailMultiAlternatives
    from datetime import timedelta
    from django.utils import timezone

    today = timezone.now().date()
    last_week_start = today - timedelta(days=7)
    
    # Get all reports from last week
    all_reports = WeeklyReportV2.objects.filter(
        week_start__gte=last_week_start
    ).select_related('intern', 'intern__internprofile')

    if not all_reports.exists():
        return

    # Identify recipients (Managers and Admins)
    staff = User.objects.filter(role__in=['ADMIN', 'MANAGER'], is_active=True)
    messages = []
    notifications_to_create = []

    for member in staff:
        try:
            # Filter reports relevant to this staff member
            if member.role == 'MANAGER' and member.department:
                reports = [r for r in all_reports if r.intern.department == member.department]
            else:
                reports = all_reports

            if not reports:
                continue

            team_data = []
            total_score = 0
            total_tasks = 0
            total_att = 0
            red_flags = []

            for r in reports:
                score = round(r.overall_weekly_score, 1)
                team_data.append({
                    'name': r.intern.get_full_name() or r.intern.username,
                    'score': score,
                    'tasks_completed': r.tasks_completed,
                    'tasks_assigned': r.tasks_assigned,
                    'attendance_pct': round(r.attendance_pct, 1),
                    'status': getattr(r.intern.internprofile, 'status', 'ACTIVE')
                })
                total_score += score
                total_tasks += r.tasks_completed
                total_att += r.attendance_pct
                
                if r.red_flag:
                    red_flags.append({
                        'name': r.intern.get_full_name() or r.intern.username,
                        'reason': r.red_flag_reasons or "High deviation in performance metrics."
                    })

            # Fetch recent tasks for the team
            recent_tasks = []
            if reports:
                intern_ids = [r.intern_id for r in reports]
                tasks = TaskTracking.objects.filter(
                    intern_id__in=intern_ids,
                    assigned_at__date__gte=last_week_start
                ).order_by('-completed_at', '-assigned_at')[:15]
                
                recent_tasks = []
                for t in tasks:
                    status = t.get_status_display()
                    color_class = 'status-default'
                    if status == 'Completed':
                        color_class = 'status-completed'
                    elif status == 'In Progress':
                        color_class = 'status-in-progress'
                    
                    recent_tasks.append({
                        'intern': t.intern.get_full_name() or t.intern.email,
                        'title': t.title,
                        'status': status,
                        'color_class': color_class
                    })

            context = {
                'department_name': member.department if hasattr(member, 'department') else "Organization",
                'active_interns_count': len(reports),
                'avg_team_score': round(total_score / len(reports), 1),
                'total_tasks_completed': total_tasks,
                'team_attendance_avg': round(total_att / len(reports), 1),
                'team_data': team_data,
                'red_flags': red_flags,
                'recent_tasks': recent_tasks,
                'dashboard_url': f"{settings.FRONTEND_URL}/admin/dashboard" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:5173/admin/dashboard"
            }

            html_content = render_to_string('emails/manager_team_summary.html', context)
            
            msg = EmailMultiAlternatives(
                subject=f"Weekly Team Intelligence Summary — {context['department_name']}",
                body="Your weekly team performance summary is ready.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[member.email]
            )
            msg.attach_alternative(html_content, "text/html")
            messages.append(msg)
            
            # Prepare notification
            from apps.notifications.models import Notification
            notifications_to_create.append(
                Notification(
                    user=member,
                    notification_type='SYSTEM',
                    title="Departmental Weekly Summary Available",
                    message=f"The weekly performance summary for {context['department_name']} is now available for review.",
                    link=context['dashboard_url']
                )
            )

        except Exception as e:
            logger.error(f"Error preparing manager summary for {member.email}: {e}")

    if messages:
        try:
            connection = get_connection()
            connection.send_messages(messages)
            logger.info(f"Successfully sent {len(messages)} manager summaries.")
            
            # Create in-app notifications
            if notifications_to_create:
                from apps.notifications.models import Notification
                Notification.objects.bulk_create(notifications_to_create)
                
        except Exception as e:
            logger.error(f"Failed to send batch manager emails: {e}")
