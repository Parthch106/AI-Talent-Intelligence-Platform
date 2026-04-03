import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.accounts.models import User
from apps.analytics.models import AttendanceRecord, TaskTracking

alex = User.objects.get(email='alex.johnson@intern.com')
emily = User.objects.get(email='emily.davis@intern.com')

print('=== ATTENDANCE SAMPLE (Alex Johnson) ===')
for att in AttendanceRecord.objects.filter(intern=alex).order_by('-date')[:10]:
    print(f'{att.date} - {att.status} - {att.check_in_time} to {att.check_out_time}')

print('\n=== ATTENDANCE STATUS BREAKDOWN (Alex) ===')
for status_code, status_name in AttendanceRecord.STATUS_CHOICES:
    count = AttendanceRecord.objects.filter(intern=alex, status=status_code).count()
    print(f'{status_name}: {count}')

print('\n=== TASKS (Alex Johnson) ===')
for task in TaskTracking.objects.filter(intern=alex):
    print(f'{task.task_id}: {task.title} - {task.status} (Priority: {task.priority})')

print('\n=== TASKS (Emily Davis) ===')
for task in TaskTracking.objects.filter(intern=emily):
    print(f'{task.task_id}: {task.title} - {task.status} (Priority: {task.priority})')

print('\n=== MANAGER CHECK ===')
manager_ai = User.objects.get(email='manager@test.com')
manager_web = User.objects.get(email='manager2@test.com')

# Check department interns
ai_interns = User.objects.filter(department='AI/ML', role='INTERN')
web_interns = User.objects.filter(department='Web Development', role='INTERN')

print(f'Manager {manager_ai.email} (AI/ML): {ai_interns.count()} interns in department')
for u in ai_interns:
    print(f'  - {u.email}: {u.full_name}')

print(f'\nManager {manager_web.email} (Web Development): {web_interns.count()} interns in department')
for u in web_interns:
    print(f'  - {u.email}: {u.full_name}')
