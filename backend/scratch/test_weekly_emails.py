
import os
import sys
import django
from django.utils import timezone
from datetime import timedelta

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
settings.EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

from apps.accounts.models import User
from apps.analytics.models import WeeklyReportV2, EmploymentStage
from apps.analytics.tasks import send_weekly_intern_performance_emails, send_weekly_manager_summary_emails

def test_weekly_emails():
    intern = User.objects.filter(role='INTERN', is_active=True).first()
    if not intern:
        print("No intern found for testing.")
        return

    print(f"Ensuring data exists for {intern.email}...")
    
    # 1. Create a dummy weekly report for last week
    report, created = WeeklyReportV2.objects.get_or_create(
        intern=intern,
        week_start=timezone.now().date() - timedelta(days=7),
        defaults={
            'week_end': timezone.now().date() - timedelta(days=1),
            'week_number': 10,
            'overall_weekly_score': 88.5,
            'productivity_score': 90.0,
            'quality_score': 85.0,
            'engagement_score': 90.0,
            'attendance_pct': 95.0,
            'tasks_assigned': 10,
            'tasks_completed': 9,
            'ai_narrative': "Exceptional work on the frontend modules this week. Your quality index is improving.",
            'is_auto_generated': True
        }
    )
    if not created:
        print("  Using existing report.")
    else:
        print("  Created fresh report.")

    # 2. Set phase end date to "near" (10 days from now)
    stage = EmploymentStage.objects.filter(intern=intern).order_by('-phase_start_date').first()
    if stage:
        stage.phase_end_date = timezone.now().date() + timedelta(days=10)
        stage.save(update_fields=['phase_end_date'])
        print(f"  Set phase end date to {stage.phase_end_date} (Promotion should show).")

    print("\nTriggering Intern Performance Email Task...")
    try:
        # We call the function directly (not .delay()) for synchronous testing
        send_weekly_intern_performance_emails()
        print("  [SUCCESS] Intern emails task finished.")
    except Exception as e:
        print(f"  [FAILED] Intern emails task: {e}")

    print("\nTriggering Manager Summary Email Task...")
    try:
        send_weekly_manager_summary_emails()
        print("  [SUCCESS] Manager summary task finished.")
    except Exception as e:
        print(f"  [FAILED] Manager summary task: {e}")

    print("\nTest complete. Check the logs (or SMTP outbox) for results.")

if __name__ == "__main__":
    test_weekly_emails()
