import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.accounts.models import User
from apps.analytics.models import AttendanceRecord, TaskTracking
from apps.interns.models import InternProfile
from apps.projects.models import ProjectAssignment

print('Total users:', User.objects.count())
print('Managers:', User.objects.filter(role='MANAGER').count())
print('Interns:', User.objects.filter(role='INTERN').count())

print('\n=== New Interns ===')
for email in ['alex.johnson@intern.com', 'emily.davis@intern.com']:
    try:
        u = User.objects.get(email=email)
        print(f'{u.email}: exists, dept={u.department}')
        try:
            profile = InternProfile.objects.get(user=u)
            print(f'  Profile: {profile.university}, {profile.phone_number}')
        except:
            print('  No profile')
        try:
            pa = ProjectAssignment.objects.filter(intern=u)
            print(f'  Assignments: {pa.count()}')
        except:
            print('  No assignments')
        att = AttendanceRecord.objects.filter(intern=u).count()
        print(f'  Attendance: {att}')
        tasks = TaskTracking.objects.filter(intern=u).count()
        print(f'  Tasks: {tasks}')
    except User.DoesNotExist:
        print(f'{email}: DOES NOT EXIST')
