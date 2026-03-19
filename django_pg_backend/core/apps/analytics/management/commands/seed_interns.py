"""
Management command to seed two new intern user accounts with profile information,
attendance records, tasks, and resume placeholder.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta, time, datetime
import random

from apps.accounts.models import User
from apps.interns.models import InternProfile
from apps.analytics.models import AttendanceRecord, TaskTracking
from apps.projects.models import ProjectAssignment, Project


class Command(BaseCommand):
    help = 'Seed two new intern user accounts with profile, attendance, and tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreate all data (attendance, tasks, assignments)'
        )

    def handle(self, *args, **kwargs):
        force = kwargs.get('force', False)
        self.stdout.write(self.style.NOTICE('Seeding new intern accounts...'))
        
        # Define the two interns to create
        interns_data = [
            {
                'email': 'alex.johnson@intern.com',
                'full_name': 'Alex Johnson',
                'department': 'AI/ML',
                'password': 'intern123',
                'profile': {
                    'phone_number': '+1-555-0101',
                    'location': 'San Francisco, CA',
                    'university': 'Stanford University',
                    'gpa': 3.85,
                    'graduation_year': 2026,
                    'github_profile': 'https://github.com/alexjohnson',
                    'linkedin_profile': 'https://linkedin.com/in/alexjohnson',
                    'skills': ['Python', 'Machine Learning', 'TensorFlow', 'Data Analysis', 'SQL'],
                }
            },
            {
                'email': 'emily.davis@intern.com',
                'full_name': 'Emily Davis',
                'department': 'Web Development',
                'password': 'intern123',
                'profile': {
                    'phone_number': '+1-555-0102',
                    'location': 'New York, NY',
                    'university': 'MIT',
                    'gpa': 3.72,
                    'graduation_year': 2026,
                    'github_profile': 'https://github.com/emilydavis',
                    'linkedin_profile': 'https://linkedin.com/in/emilydavis',
                    'skills': ['JavaScript', 'React', 'Node.js', 'TypeScript', 'CSS'],
                }
            },
        ]

        # Get managers for assignment
        try:
            manager_ai = User.objects.get(email='manager@test.com', role=User.Role.MANAGER)
            manager_web = User.objects.get(email='manager2@test.com', role=User.Role.MANAGER)
        except User.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f'Manager not found: {e}'))
            return

        managers_map = {
            'AI/ML': manager_ai,
            'Web Development': manager_web,
        }

        # Check if interns already exist
        for intern_data in interns_data:
            # Check if user exists
            existing_user = User.objects.filter(email=intern_data['email']).first()
            
            if existing_user and not force:
                self.stdout.write(self.style.WARNING(f"Intern {intern_data['email']} already exists, skipping..."))
                continue
            
            if existing_user and force:
                # Use existing user but still create profile/data
                user = existing_user
                self.stdout.write(f"Using existing user: {user.email}")
            else:
                # Create new user
                user = User.objects.create_user(
                    email=intern_data['email'],
                    password=intern_data['password'],
                    full_name=intern_data['full_name'],
                    role=User.Role.INTERN,
                    department=intern_data['department'],
                )
                self.stdout.write(self.style.SUCCESS(f"Created user: {user.email}"))

            # Create or get intern profile
            profile, _ = InternProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone_number': intern_data['profile']['phone_number'],
                    'location': intern_data['profile']['location'],
                    'university': intern_data['profile']['university'],
                    'gpa': intern_data['profile']['gpa'],
                    'graduation_year': intern_data['profile']['graduation_year'],
                    'github_profile': intern_data['profile']['github_profile'],
                    'linkedin_profile': intern_data['profile']['linkedin_profile'],
                    'skills': intern_data['profile']['skills'],
                    'status': 'ACTIVE',
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Created/updated profile for: {user.full_name}"))

            # Create project assignment for the intern
            manager = managers_map[intern_data['department']]
            
            # Get or create a project for the manager's department
            project_name = f"{intern_data['department']} Internship Project"
            project, _ = Project.objects.get_or_create(
                name=project_name,
                defaults={
                    'description': f'Training project for {intern_data["department"]} interns',
                    'start_date': date.today() - timedelta(days=60),
                    'status': 'IN_PROGRESS',
                    'mentor': manager,
                }
            )

            # Create project assignment
            assignment, _ = ProjectAssignment.objects.get_or_create(
                intern=user,
                project=project,
                defaults={
                    'assigned_at': date.today() - timedelta(days=60),
                    'status': 'ACTIVE',
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Created project assignment for: {user.full_name}"))

            # Generate 30 days of attendance records with varied patterns
            self._generate_attendance(user)
            
            # Generate tasks with varying statuses
            self._generate_tasks(user, manager)

        self.stdout.write(self.style.SUCCESS('\n===== INTERN SEEDING COMPLETE ====='))
        self.stdout.write(self.style.SUCCESS('Intern 1: alex.johnson@intern.com / intern123 (AI/ML - manager@test.com)'))
        self.stdout.write(self.style.SUCCESS('Intern 2: emily.davis@intern.com / intern123 (Web Development - manager2@test.com)'))

    def _generate_attendance(self, user):
        """Generate 30 days of attendance with varied patterns."""
        self.stdout.write(f'  Generating attendance records for {user.full_name}...')
        
        # Start from 30 days ago
        start_date = date.today() - timedelta(days=30)
        
        # Seed random for consistent patterns per user
        random.seed(f'attendance_{user.id}')
        
        # Define attendance pattern for this intern (0-1 scale)
        # Some interns are more regular, some have more absences
        regularity_factor = random.uniform(0.7, 0.9)  # 70-90% attendance rate
        
        for i in range(30):
            current_date = start_date + timedelta(days=i)
            
            # Skip weekends
            if current_date.weekday() >= 5:
                continue
            
            # Determine attendance status based on regularity factor
            rand = random.random()
            
            if rand < regularity_factor:
                # Present - with occasional variation
                if random.random() < 0.15:
                    # Occasionally late (15% of present days)
                    status = 'LATE'
                    check_in = time(9, random.randint(30, 59))
                    check_out = time(18, 0)
                    working_hours = 8.5
                    notes = 'Arrived late'
                elif random.random() < 0.1:
                    # Occasionally work from home (10% of present days)
                    status = 'WORK_FROM_HOME'
                    check_in = time(9, 0)
                    check_out = time(18, 0)
                    working_hours = 9.0
                    notes = 'Working from home'
                else:
                    # Normal present
                    status = 'PRESENT'
                    check_in = time(9, random.randint(0, 15))
                    check_out = time(18, random.randint(0, 30))
                    working_hours = 9.0
                    notes = ''
            elif rand < regularity_factor + 0.05:
                # Absent (5% chance)
                status = 'ABSENT'
                check_in = None
                check_out = None
                working_hours = 0.0
                notes = 'Absent'
            elif rand < regularity_factor + 0.08:
                # Half day (3% chance)
                status = 'HALF_DAY'
                check_in = time(9, 0)
                check_out = time(13, 0)
                working_hours = 4.0
                notes = 'Half day'
            else:
                # Late (remaining)
                status = 'LATE'
                check_in = time(9, random.randint(45, 59))
                check_out = time(18, 0)
                working_hours = 8.25
                notes = 'Arrived late'

            # Create attendance record
            AttendanceRecord.objects.get_or_create(
                intern=user,
                date=current_date,
                defaults={
                    'status': status,
                    'check_in_time': check_in,
                    'check_out_time': check_out,
                    'working_hours': working_hours,
                    'notes': notes,
                }
            )
        
        self.stdout.write(self.style.SUCCESS(f'    Created 30 days of attendance records'))

    def _generate_tasks(self, user, manager):
        """Generate tasks with varying statuses."""
        self.stdout.write(f'  Generating tasks for {user.full_name}...')
        
        # Define sample tasks based on department
        if user.department == 'AI/ML':
            tasks = [
                {'title': 'Machine Learning Basics Quiz', 'description': 'Complete the ML fundamentals quiz', 'status': 'COMPLETED', 'priority': 'HIGH'},
                {'title': 'Data Preprocessing Workshop', 'description': 'Attend data preprocessing workshop', 'status': 'COMPLETED', 'priority': 'MEDIUM'},
                {'title': 'Model Training Assignment', 'description': 'Train a simple neural network model', 'status': 'IN_PROGRESS', 'priority': 'HIGH'},
                {'title': 'Team Code Review', 'description': 'Participate in team code review session', 'status': 'IN_PROGRESS', 'priority': 'MEDIUM'},
                {'title': 'Research Paper Summary', 'description': 'Summarize latest ML research paper', 'status': 'ASSIGNED', 'priority': 'LOW'},
                {'title': 'API Integration Task', 'description': 'Integrate ML model with REST API', 'status': 'ASSIGNED', 'priority': 'HIGH'},
                {'title': 'Documentation Update', 'description': 'Update project documentation', 'status': 'SUBMITTED', 'priority': 'LOW'},
            ]
        else:  # Web Development
            tasks = [
                {'title': 'HTML/CSS Basics', 'description': 'Complete HTML and CSS tutorial', 'status': 'COMPLETED', 'priority': 'HIGH'},
                {'title': 'JavaScript Fundamentals', 'description': 'Complete JavaScript exercises', 'status': 'COMPLETED', 'priority': 'HIGH'},
                {'title': 'React Component Build', 'description': 'Build reusable React components', 'status': 'IN_PROGRESS', 'priority': 'HIGH'},
                {'title': 'API Endpoint Development', 'description': 'Develop REST API endpoints', 'status': 'IN_PROGRESS', 'priority': 'MEDIUM'},
                {'title': 'Unit Testing', 'description': 'Write unit tests for components', 'status': 'ASSIGNED', 'priority': 'MEDIUM'},
                {'title': 'Database Schema Design', 'description': 'Design database schema for project', 'status': 'ASSIGNED', 'priority': 'HIGH'},
                {'title': 'Code Refactoring', 'description': 'Refactor legacy code', 'status': 'REVIEWED', 'priority': 'LOW'},
            ]

        random.seed(f'tasks_{user.id}')
        
        for i, task_data in enumerate(tasks):
            # Calculate due date
            days_ago = random.randint(-10, 10)
            due_date = timezone.now() + timedelta(days=days_ago)
            
            # Set submitted/completed dates based on status
            submitted_at = None
            completed_at = None
            
            if task_data['status'] in ['SUBMITTED', 'REVIEWED', 'COMPLETED']:
                submitted_at = timezone.now() - timedelta(days=random.randint(1, 5))
            
            if task_data['status'] == 'COMPLETED':
                completed_at = timezone.now() - timedelta(days=random.randint(0, 2))
            
            # Create task
            TaskTracking.objects.get_or_create(
                intern=user,
                task_id=f'TASK-{user.id}-{i+1:03d}',
                defaults={
                    'title': task_data['title'],
                    'description': task_data['description'],
                    'status': task_data['status'],
                    'priority': task_data['priority'],
                    'due_date': due_date,
                    'assigned_at': timezone.now() - timedelta(days=random.randint(5, 20)),
                    'submitted_at': submitted_at,
                    'completed_at': completed_at,
                    'estimated_hours': random.uniform(2, 16),
                    'actual_hours': random.uniform(1, 12) if task_data['status'] != 'ASSIGNED' else 0,
                }
            )
        
        self.stdout.write(self.style.SUCCESS(f'    Created {len(tasks)} tasks with varying statuses'))
