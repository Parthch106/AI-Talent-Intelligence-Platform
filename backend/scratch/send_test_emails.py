
import os
import sys
import django
from django.utils import timezone
from datetime import timedelta
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives, get_connection
from django.conf import settings

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import WeeklyReportV2, EmploymentStage

def send_test_emails(target_email):
    print(f"Starting test email sequence for: {target_email}")
    
    intern = User.objects.filter(email=target_email).first()
    if not intern:
        # Create a dummy user if not found
        intern = User.objects.create(
            email=target_email,
            full_name="Parth Chauhan (Test)",
            role='INTERN',
            department='Engineering'
        )
        print(f"  Created test intern user.")
    
    # Ensure a weekly report exists
    report, _ = WeeklyReportV2.objects.get_or_create(
        intern=intern,
        week_start=timezone.now().date() - timedelta(days=7),
        defaults={
            'week_end': timezone.now().date() - timedelta(days=1),
            'week_number': 12,
            'overall_weekly_score': 92.4,
            'productivity_score': 95.0,
            'quality_score': 90.0,
            'attendance_pct': 100.0,
            'tasks_assigned': 15,
            'tasks_completed': 14,
            'ai_narrative': "Excellent progress on the notification system and AI integration. Your contribution to the project architecture is highly valued.",
        }
    )
    
    # 1. Prepare Intern Email
    print("  Preparing Intern Performance Email...")
    intern_context = {
        'intern_email': target_email,
        'week_dates': f"{report.week_start} to {report.week_end}",
        'overall_score': round(report.overall_weekly_score, 1),
        'productivity_score': round(report.productivity_score, 1),
        'quality_score': round(report.quality_score, 1),
        'attendance_pct': round(report.attendance_pct, 1),
        'ai_narrative': report.ai_narrative,
        'tasks_completed': report.tasks_completed,
        'tasks_assigned': report.tasks_assigned,
        'task_list': [
            {'title': 'Implement Notification Signals', 'status': 'Completed', 'color_class': 'status-completed'},
            {'title': 'Refactor Weekly Report Logic', 'status': 'Completed', 'color_class': 'status-completed'},
            {'title': 'AI Integration with GPT-4o mini', 'status': 'In Progress', 'color_class': 'status-in-progress'},
        ],
        'show_promotion_indicator': True,
        'phase_name': "Phase 2 (Monitoring)",
        'phase_end_date': (timezone.now() + timedelta(days=5)).strftime('%b %d, %Y'),
        'timeline_url': "http://localhost:5173/career/phase-timeline"
    }
    
    intern_html = render_to_string('emails/weekly_performance_report.html', intern_context)
    intern_msg = EmailMultiAlternatives(
        subject="[TEST] Weekly Performance Insight — Parth Chauhan",
        body="Test Body",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[target_email]
    )
    intern_msg.attach_alternative(intern_html, "text/html")
    
    # 2. Prepare Manager Email
    print("  Preparing Manager Team Summary Email...")
    manager_context = {
        'department_name': "Engineering (Test)",
        'active_interns_count': 3,
        'avg_team_score': 88.2,
        'total_tasks_completed': 42,
        'team_attendance_avg': 96.5,
        'team_data': [
            {'name': 'Parth Chauhan', 'score': 92.4, 'tasks_completed': 14, 'tasks_assigned': 15, 'attendance_pct': 100, 'status': 'ACTIVE'},
            {'name': 'Alex Johnson', 'score': 85.0, 'tasks_completed': 12, 'tasks_assigned': 12, 'attendance_pct': 92, 'status': 'ACTIVE'},
            {'name': 'Emily Davis', 'score': 68.5, 'tasks_completed': 8, 'tasks_assigned': 15, 'attendance_pct': 85, 'status': 'ON_PROBATION'},
        ],
        'red_flags': [
            {'name': 'Emily Davis', 'reason': 'Performance score fell below 70% for two consecutive weeks.'}
        ],
        'recent_tasks': [
            {'intern': 'Parth Chauhan', 'title': 'Implement Notification Signals', 'status': 'Completed', 'color_class': 'status-completed'},
            {'intern': 'Alex Johnson', 'title': 'Frontend Bug Fixes', 'status': 'Completed', 'color_class': 'status-completed'},
            {'intern': 'Emily Davis', 'title': 'Database Optimization', 'status': 'In Progress', 'color_class': 'status-in-progress'},
        ],
        'dashboard_url': "http://localhost:5173/admin/dashboard"
    }
    
    manager_html = render_to_string('emails/manager_team_summary.html', manager_context)
    manager_msg = EmailMultiAlternatives(
        subject="[TEST] Weekly Team Intelligence Summary — Engineering",
        body="Test Body",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[target_email]
    )
    manager_msg.attach_alternative(manager_html, "text/html")
    
    # 3. Send both
    print(f"  Sending batch to {target_email}...")
    try:
        connection = get_connection()
        connection.send_messages([intern_msg, manager_msg])
        print("  [SUCCESS] Both emails sent successfully!")
    except Exception as e:
        print(f"  [FAILED] Error sending emails: {e}")

if __name__ == "__main__":
    send_test_emails('parthdchauhan106@gmail.com')
