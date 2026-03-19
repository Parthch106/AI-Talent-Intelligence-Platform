#!/usr/bin/env python
"""
Script to verify attendance records were seeded correctly.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import AttendanceRecord
from apps.projects.models import ProjectAssignment


def main():
    print('=' * 60)
    print('ATTENDANCE RECORDS VERIFICATION')
    print('=' * 60)
    
    # Get interns
    interns = User.objects.filter(role=User.Role.INTERN)
    print(f'\n[INTERNS IN SYSTEM]: {interns.count()}')
    for intern in interns:
        print(f'  - {intern.full_name} ({intern.email})')
    
    # Get project assignments
    print(f'\n[PROJECT ASSIGNMENTS]')
    assignments = ProjectAssignment.objects.filter(status='ACTIVE').select_related('project', 'intern')
    if assignments.exists():
        for a in assignments:
            print(f'  - {a.intern.full_name} -> {a.project.name} ({a.role})')
    else:
        print('  No active project assignments found')
    
    # Get attendance records
    print(f'\n[ATTENDANCE RECORDS FOR 2025]')
    total = AttendanceRecord.objects.filter(date__year=2025).count()
    print(f'Total records: {total}')
    
    for intern in interns:
        count = AttendanceRecord.objects.filter(intern=intern, date__year=2025).count()
        print(f'\n  {intern.full_name}:')
        print(f'    Total records: {count}')
        
        # Show status breakdown
        present = AttendanceRecord.objects.filter(intern=intern, date__year=2025, status='PRESENT').count()
        absent = AttendanceRecord.objects.filter(intern=intern, date__year=2025, status='ABSENT').count()
        wfh = AttendanceRecord.objects.filter(intern=intern, date__year=2025, status='WORK_FROM_HOME').count()
        late = AttendanceRecord.objects.filter(intern=intern, date__year=2025, status='LATE').count()
        half = AttendanceRecord.objects.filter(intern=intern, date__year=2025, status='HALF_DAY').count()
        
        print(f'    - Present: {present}')
        print(f'    - Absent: {absent}')
        print(f'    - Work From Home: {wfh}')
        print(f'    - Late: {late}')
        print(f'    - Half Day: {half}')
        
        # Calculate attendance rate
        if count > 0:
            rate = ((present + wfh + (half * 0.5)) / count) * 100
            print(f'    - Attendance Rate: {rate:.1f}%')
        
        # Show sample records
        sample = AttendanceRecord.objects.filter(intern=intern, date__year=2025).order_by('date')[:3]
        print(f'    - First 3 records:')
        for r in sample:
            print(f'        {r.date} - {r.status}')
    
    print('\n' + '=' * 60)
    print('VERIFICATION COMPLETE')
    print('=' * 60)


if __name__ == '__main__':
    main()
