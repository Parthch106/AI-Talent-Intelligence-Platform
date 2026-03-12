"""
Management command to seed attendance records for all interns.
Generates 12 months of attendance data with realistic patterns.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random

from apps.accounts.models import User
from apps.analytics.models import AttendanceRecord
from apps.projects.models import ProjectAssignment


class Command(BaseCommand):
    help = 'Seed attendance records for all interns with 12 months of data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            default=2025,
            help='Year to generate attendance for (default: 2025)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing attendance records before seeding'
        )

    def get_workdays(self, year):
        """Generate list of workdays for the given year (excluding weekends)."""
        workdays = []
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        current = start_date
        while current <= end_date:
            # Skip weekends (Saturday=5, Sunday=6)
            if current.weekday() < 5:
                workdays.append(current)
            current += timedelta(days=1)
        
        return workdays

    def get_attendance_status(self, workday_num, total_days):
        """
        Generate realistic attendance status based on workday pattern.
        Returns weighted random status.
        """
        # Base probabilities (realistic attendance patterns)
        status_choices = [
            ('PRESENT', 0.75),      # 75% present
            ('WORK_FROM_HOME', 0.10),  # 10% work from home
            ('ABSENT', 0.06),       # 6% absent
            ('LATE', 0.05),         # 5% late
            ('HALF_DAY', 0.04),     # 4% half day
        ]
        
        # Random selection with weights
        rand = random.random()
        cumulative = 0
        
        for status, weight in status_choices:
            cumulative += weight
            if rand < cumulative:
                return status
        
        return 'PRESENT'

    def get_check_times(self, status):
        """Generate check-in and check-out times based on status."""
        if status == 'ABSENT':
            return None, None, 0.0
        
        if status == 'HALF_DAY':
            # Half day - morning only
            return (
                time(9, 15),
                time(13, 0),
                3.75
            )
        
        if status == 'LATE':
            # Late arrival
            return (
                time(9, 45),
                time(18, 0),
                8.25
            )
        
        # Normal day or WFH - standard hours
        base_check_in = time(9, 0) if random.random() > 0.1 else time(8, 45)
        base_check_out = time(18, 0) if random.random() > 0.1 else time(17, 45)
        
        # Calculate working hours
        check_in_dt = datetime.combine(date.today(), base_check_in)
        check_out_dt = datetime.combine(date.today(), base_check_out)
        working_hours = (check_out_dt - check_in_dt).seconds / 3600.0
        
        return base_check_in, base_check_out, working_hours

    def handle(self, *args, **kwargs):
        year = kwargs['year']
        clear_existing = kwargs.get('clear', False)
        
        self.stdout.write(self.style.NOTICE(f'Seeding attendance for year {year}...'))
        
        # Get all interns
        interns = User.objects.filter(role=User.Role.INTERN, is_active=True)
        
        if not interns.exists():
            self.stdout.write(self.style.ERROR('No active interns found in the system!'))
            return
        
        self.stdout.write(f'Found {interns.count()} active interns')
        
        # Get project assignments for each intern
        intern_assignments = {}
        for intern in interns:
            assignments = ProjectAssignment.objects.filter(
                intern=intern,
                status='ACTIVE'
            ).select_related('project')
            intern_assignments[intern.id] = list(assignments)
        
        # Get workdays for the year
        workdays = self.get_workdays(year)
        total_workdays = len(workdays)
        
        self.stdout.write(f'Found {total_workdays} workdays in {year}')
        
        # Clear existing attendance if requested
        if clear_existing:
            deleted_count = AttendanceRecord.objects.filter(date__year=year).delete()[0]
            self.stdout.write(self.style.WARNING(f'Cleared {deleted_count} existing attendance records'))
        
        # Create attendance records for each intern
        total_created = 0
        total_skipped = 0
        
        for intern in interns:
            self.stdout.write(f'\nProcessing intern: {intern.full_name} ({intern.email})')
            
            # Check existing records for this year
            existing_count = AttendanceRecord.objects.filter(
                intern=intern,
                date__year=year
            ).count()
            
            if existing_count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'  Skipping - already has {existing_count} records for {year}'
                    )
                )
                total_skipped += 1
                continue
            
            # Generate attendance for each workday
            created_count = 0
            random.seed(f'{intern.id}_{year}')  # Reproducible results per intern
            
            for idx, workday in enumerate(workdays):
                status = self.get_attendance_status(idx, total_workdays)
                
                # Create attendance record
                attendance, created = AttendanceRecord.objects.update_or_create(
                    intern=intern,
                    date=workday,
                    defaults={
                        'status': status,
                        'notes': self._get_notes(status, workday),
                    }
                )
                
                if created:
                    # Set times based on status
                    check_in, check_out, hours = self.get_check_times(status)
                    attendance.check_in_time = check_in
                    attendance.check_out_time = check_out
                    attendance.working_hours = hours
                    attendance.save()
                    created_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  Created {created_count} attendance records'
                )
            )
            total_created += created_count
        
        self.stdout.write(self.style.SUCCESS(f'\n===== SUMMARY ====='))
        self.stdout.write(f'Total records created: {total_created}')
        self.stdout.write(f'Interns skipped (existing data): {total_skipped}')
        self.stdout.write(f'Total interns processed: {interns.count()}')
        
        # Show summary by status
        self.stdout.write(self.style.SUCCESS(f'\n===== ATTENDANCE BREAKDOWN ====='))
        
        year_attendance = AttendanceRecord.objects.filter(date__year=year)
        for status_code, status_name in AttendanceRecord.STATUS_CHOICES:
            count = year_attendance.filter(status=status_code).count()
            self.stdout.write(f'{status_name}: {count}')
        
        self.stdout.write(self.style.SUCCESS('\nAttendance seeding completed!'))

    def _get_notes(self, status, workday):
        """Generate notes based on attendance status."""
        if status == 'WORK_FROM_HOME':
            return 'Working from home'
        elif status == 'LATE':
            return 'Arrived late'
        elif status == 'HALF_DAY':
            return 'Half day - personal reason'
        elif status == 'ABSENT':
            return 'Absent'
        return ''


# Import datetime for time function
from datetime import time, datetime
