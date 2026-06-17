import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.analytics.models import TaskTracking, AttendanceRecord

class Command(BaseCommand):
    help = 'Adds tasks and attendance records for existing interns'

    def handle(self, *args, **kwargs):
        self.stdout.write('Adding tasks and attendance for interns...')

        # Define task templates by department
        AI_ML_TASKS = [
            "Implement machine learning model for talent prediction",
            "Train and evaluate NLP model for resume parsing",
            "Develop sentiment analysis pipeline for candidate feedback",
            "Create data preprocessing pipeline for structured data",
            "Build recommendation engine for skill matching",
            "Implement anomaly detection for hiring patterns",
            "Develop clustering algorithm for talent segmentation",
            "Create visualization dashboard for analytics metrics",
            "Optimize model inference time for real-time predictions",
            "Implement data augmentation techniques for training",
            "Build API endpoints for ML model serving",
            "Develop feature engineering pipeline for candidate scoring",
            "Create unit tests for ML model functionality",
            "Implement model versioning and deployment pipeline",
            "Build document processing pipeline for resumes",
            "Develop keyword extraction algorithm from job descriptions",
            "Create performance monitoring system for deployed models",
            "Implement A/B testing framework for model improvements",
            "Build text classification system for resume categorization",
            "Develop entity recognition for candidate profiles",
        ]

        WEB_DEV_TASKS = [
            "Implement user authentication and authorization",
            "Create responsive dashboard layout with React components",
            "Build REST API endpoints for intern management",
            "Develop database schema for attendance tracking",
            "Implement real-time notification system",
            "Create file upload and processing functionality",
            "Build form validation and error handling",
            "Develop pagination for large data sets",
            "Implement search and filter functionality",
            "Create unit and integration tests for frontend",
            "Build CI/CD pipeline for automated deployment",
            "Develop caching layer for improved performance",
            "Create admin panel for manager operations",
            "Implement logging and monitoring system",
            "Build export functionality for reports",
            "Develop real-time chat feature for interns",
            "Create calendar view for attendance tracking",
            "Implement role-based access control",
            "Build email notification system",
            "Develop dashboard widgets for analytics",
        ]

        # Get interns grouped by department
        interns_by_department = {}
        for intern in User.objects.filter(role=User.Role.INTERN):
            dept = intern.department or 'General'
            if dept not in interns_by_department:
                interns_by_department[dept] = []
            interns_by_department[dept].append(intern)

        # Get managers grouped by department
        managers_by_department = {}
        for manager in User.objects.filter(role=User.Role.MANAGER):
            dept = manager.department or 'General'
            if dept not in managers_by_department:
                managers_by_department[dept] = []
            managers_by_department[dept].append(manager)

        # Add tasks for each intern
        task_counter = 1
        for dept, interns in interns_by_department.items():
            tasks_list = AI_ML_TASKS if 'AI' in dept or 'ML' in dept else WEB_DEV_TASKS
            managers = managers_by_department.get(dept, [])
            
            for intern in interns:
                self.stdout.write(f'\nProcessing tasks for {intern.full_name} ({dept})')
                
                # Shuffle and pick 15-20 tasks
                num_tasks = random.randint(15, 20)
                selected_tasks = random.sample(tasks_list, min(num_tasks, len(tasks_list)))
                
                created_count = 0
                for idx, task_title in enumerate(selected_tasks):
                    # Determine task status
                    if idx < 5:
                        status = 'COMPLETED'
                    elif idx < 10:
                        status = 'IN_PROGRESS'
                    else:
                        status = 'ASSIGNED'
                    
                    # Determine priority
                    priority = random.choice(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
                    
                    # Determine complexity
                    complexity = random.choice(['SIMPLE', 'MODERATE', 'COMPLEX', 'VERY_COMPLEX'])
                    
                    # Calculate due date (within last 30 days to 30 days ahead)
                    days_offset = random.randint(-30, 30)
                    due_date = timezone.now().date() + timedelta(days=days_offset)
                    
                    # Create task
                    task_id = f"TASK-{intern.id:03d}-{task_counter:04d}"
                    task_counter += 1
                    
                    # Check if task already exists
                    if TaskTracking.objects.filter(task_id=task_id).exists():
                        continue
                    
                    estimated_hours = random.uniform(2, 16)
                    actual_hours = estimated_hours * random.uniform(0.5, 1.2) if status == 'COMPLETED' else 0
                    
                    task = TaskTracking.objects.create(
                        intern=intern,
                        task_id=task_id,
                        title=task_title,
                        description=f"Task assigned to {intern.full_name} in {dept} department.",
                        status=status,
                        priority=priority,
                        complexity=complexity,
                        due_date=due_date,
                        estimated_hours=estimated_hours,
                        actual_hours=actual_hours,
                        quality_rating=random.uniform(3.0, 5.0) if status == 'COMPLETED' else None,
                        code_review_score=random.uniform(70, 100) if status == 'COMPLETED' else None,
                        bug_count=random.randint(0, 5) if status == 'COMPLETED' else 0,
                    )
                    
                    # Set completed_at for completed tasks
                    if status == 'COMPLETED':
                        task.completed_at = timezone.now() - timedelta(days=random.randint(1, 20))
                        task.save()
                    
                    created_count += 1
                
                self.stdout.write(self.style.SUCCESS(f'  Created {created_count} tasks for {intern.full_name}'))

        # Add attendance records for January and February 2026
        self.stdout.write('\nAdding attendance records for January and February 2026...')
        
        for intern in User.objects.filter(role=User.Role.INTERN):
            self.stdout.write(f'\nProcessing attendance for {intern.full_name}')
            
            # January 2026: 22 working days (weekends excluded)
            jan_start = date(2026, 1, 1)
            jan_end = date(2026, 1, 31)
            
            # February 2026: 20 working days (assuming no leap year issues)
            feb_start = date(2026, 2, 1)
            feb_end = date(2026, 2, 28)
            
            attendance_count = 0
            for day in self._get_working_days(jan_start, jan_end):
                # 10% chance of absence
                status = self._get_attendance_status(0.10)
                self._create_attendance(intern, day, status)
                attendance_count += 1
            
            for day in self._get_working_days(feb_start, feb_end):
                # 10% chance of absence
                status = self._get_attendance_status(0.10)
                self._create_attendance(intern, day, status)
                attendance_count += 1
            
            self.stdout.write(self.style.SUCCESS(f'  Created {attendance_count} attendance records for {intern.full_name}'))

        self.stdout.write(self.style.SUCCESS('\nData seeding complete!'))

    def _get_working_days(self, start_date, end_date):
        """Generate working days (Monday to Friday) between two dates."""
        days = []
        current = start_date
        while current <= end_date:
            if current.weekday() < 5:  # 0-4 = Monday to Friday
                days.append(current)
            current += timedelta(days=1)
        return days

    def _get_attendance_status(self, absence_probability=0.1):
        """Randomly determine attendance status based on absence probability."""
        rand = random.random()
        if rand < absence_probability:
            return 'ABSENT'
        elif rand < absence_probability + 0.05:
            return 'LATE'
        elif rand < absence_probability + 0.08:
            return 'HALF_DAY'
        elif rand < absence_probability + 0.12:
            return 'WORK_FROM_HOME'
        else:
            return 'PRESENT'

    def _create_attendance(self, intern, date_obj, status):
        """Create an attendance record if it doesn't already exist."""
        if AttendanceRecord.objects.filter(intern=intern, date=date_obj).exists():
            return
        
        check_in = None
        check_out = None
        working_hours = 0.0
        notes = ""
        
        if status == 'PRESENT':
            check_in = timezone.now().time().replace(hour=9, minute=random.randint(0, 15), second=0)
            check_out = timezone.now().time().replace(hour=18, minute=random.randint(0, 30), second=0)
            working_hours = 8.0
        elif status == 'LATE':
            check_in = timezone.now().time().replace(hour=9, minute=random.randint(16, 45), second=0)
            check_out = timezone.now().time().replace(hour=18, minute=random.randint(0, 30), second=0)
            working_hours = 7.5
            notes = "Arrived late due to traffic"
        elif status == 'HALF_DAY':
            check_in = timezone.now().time().replace(hour=9, minute=random.randint(0, 30), second=0)
            check_out = timezone.now().time().replace(hour=14, minute=0, second=0)
            working_hours = 4.5
            notes = "Left early for personal reasons"
        elif status == 'WORK_FROM_HOME':
            check_in = timezone.now().time().replace(hour=9, minute=random.randint(0, 15), second=0)
            check_out = timezone.now().time().replace(hour=18, minute=random.randint(0, 30), second=0)
            working_hours = 8.0
            notes = "Working from home today"
        else:  # ABSENT
            notes = "Absent without prior notice"
        
        AttendanceRecord.objects.create(
            intern=intern,
            date=date_obj,
            status=status,
            check_in_time=check_in,
            check_out_time=check_out,
            working_hours=working_hours,
            notes=notes,
        )
