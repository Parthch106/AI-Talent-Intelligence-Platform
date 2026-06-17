"""
Django Management Command to Analyze All Interns
===============================================

This command runs ML analysis on all interns who have resumes.

Usage:
    python manage.py analyze_all_interns
    python manage.py analyze_all_interns --role=ML_ENGINEER
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.accounts.models import User
from apps.documents.models import ResumeData
from apps.analytics.models import JobRole
from apps.analytics.services.talent_intelligence_service import talent_intelligence_service


class Command(BaseCommand):
    help = 'Run ML analysis on all interns with resumes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--role',
            type=str,
            help='Target job role for analysis (e.g., ML_ENGINEER, FRONTEND_DEVELOPER)',
        )
        parser.add_argument(
            '--intern-id',
            type=int,
            help='Analyze specific intern by ID',
        )

    def handle(self, *args, **options):
        target_role = options.get('role')
        intern_id = options.get('intern_id')

        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS('RUNNING INTERN ANALYSIS'))
        self.stdout.write(self.style.SUCCESS('='*60))

        # Get interns
        if intern_id:
            interns = User.objects.filter(id=intern_id, role=User.Role.INTERN)
            if not interns.exists():
                self.stdout.write(self.style.ERROR(f'Intern with ID {intern_id} not found'))
                return
        else:
            interns = User.objects.filter(role=User.Role.INTERN)

        # Filter interns with resumes
        interns_with_resumes = []
        for intern in interns:
            has_resume = ResumeData.objects.filter(user=intern).exists()
            if has_resume:
                interns_with_resumes.append(intern)
            else:
                self.stdout.write(self.style.WARNING(f'Skipping {intern.full_name} - No resume'))

        self.stdout.write(self.style.SUCCESS(f'\nFound {len(interns_with_resumes)} interns with resumes'))

        # Get or create job role
        job_role = None
        if target_role:
            job_role, created = JobRole.objects.get_or_create(
                role_title=target_role.upper(),
                defaults={
                    'role_description': f'{target_role} position',
                    'mandatory_skills': [],
                    'preferred_skills': []
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Using job role: {target_role}'))
        else:
            # Use first available job role
            job_role = JobRole.objects.first()
            if job_role:
                self.stdout.write(self.style.SUCCESS(f'Using first job role: {job_role.role_title}'))
            else:
                self.stdout.write(self.style.ERROR('No job roles found. Run: python manage.py seed_job_roles'))
                return

        # Run analysis
        success_count = 0
        error_count = 0

        for intern in interns_with_resumes:
            self.stdout.write(f'\nAnalyzing: {intern.full_name} ({intern.email})')
            
            try:
                result = talent_intelligence_service.analyze_resume(
                    user=intern,
                    job_role=job_role.role_title,
                    create_application=True
                )
                
                score = result.get('suitability_score', 0)
                decision = result.get('decision', 'UNKNOWN')
                
                self.stdout.write(self.style.SUCCESS(f'  [OK] Score: {score:.2f} - {decision}'))
                success_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERROR] {str(e)}'))
                error_count += 1

        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('ANALYSIS COMPLETE'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS(f'Successful: {success_count}'))
        self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('='*60))
