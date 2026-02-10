import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.interns.models import InternProfile
from apps.projects.models import Project, ProjectAssignment

class Command(BaseCommand):
    help = 'Seeds the database with initial data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # Create Admin
        if not User.objects.filter(email='admin@example.com').exists():
            User.objects.create_superuser('admin@example.com', 'adminpassword', full_name='System Admin')
            self.stdout.write('Created Admin: admin@example.com / adminpassword')

        # Create Manager
        if not User.objects.filter(email='manager@example.com').exists():
            manager = User.objects.create_user('manager@example.com', 'managerpassword', full_name='Sarah Manager', role=User.Role.MANAGER)
            self.stdout.write('Created Manager: manager@example.com / managerpassword')
        else:
            manager = User.objects.get(email='manager@example.com')

        # Create Interns
        intern_names = ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince']
        interns = []
        for name in intern_names:
            email = f"{name.lower().replace(' ', '.')}@example.com"
            if not User.objects.filter(email=email).exists():
                user = User.objects.create_user(email, 'internpassword', full_name=name, role=User.Role.INTERN)
                
                # Create Profile
                InternProfile.objects.create(
                    user=user,
                    university=random.choice(['MIT', 'Stanford', 'Google Univ', 'CSU']),
                    gpa=random.uniform(3.0, 4.0),
                    graduation_year=2025,
                    status='ACTIVE'
                )
                interns.append(user)
                self.stdout.write(f'Created Intern: {email} / internpassword')
            else:
                interns.append(User.objects.get(email=email))

        # Create Projects
        project_names = ['AI Talent Platform', 'Graph Analytics Module', 'Sentiment Analysis Engine']
        projects = []
        for name in project_names:
            if not Project.objects.filter(name=name).exists():
                project = Project.objects.create(
                    name=name,
                    description=f"Development of {name}",
                    start_date=timezone.now().date(),
                    status='IN_PROGRESS',
                    mentor=manager
                )
                projects.append(project)
                self.stdout.write(f'Created Project: {name}')
            else:
                projects.append(Project.objects.get(name=name))

        # Assign Interns to Projects
        for i, intern in enumerate(interns):
            project = projects[i % len(projects)]
            if not ProjectAssignment.objects.filter(project=project, intern=intern).exists():
                ProjectAssignment.objects.create(
                    project=project,
                    intern=intern,
                    role='Developer',
                    status='ACTIVE'
                )
                self.stdout.write(f'Assigned {intern.full_name} to {project.name}')

        self.stdout.write(self.style.SUCCESS('Data seeding complete!'))
