from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.documents.models import ResumeData
from apps.analytics.services import AnalyticsDashboardService

User = get_user_model()


class Command(BaseCommand):
    help = 'Compute intelligence for all interns who have resume data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Compute intelligence for a specific user ID only',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recompute even if intelligence already exists',
        )

    def handle(self, *args, **kwargs):
        user_id = kwargs.get('user_id')
        force = kwargs.get('force', False)
        
        analytics_service = AnalyticsDashboardService()
        
        if user_id:
            # Compute for specific user
            try:
                user = User.objects.get(id=user_id, role=User.Role.INTERN)
                self._compute_for_user(user, analytics_service, force)
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Intern with ID {user_id} not found')
                )
        else:
            # Compute for all interns
            interns = User.objects.filter(role=User.Role.INTERN)
            total = interns.count()
            
            if total == 0:
                self.stdout.write(self.style.WARNING('No interns found'))
                return
            
            self.stdout.write(f'Found {total} intern(s)')
            
            computed = 0
            skipped = 0
            failed = 0
            
            for intern in interns:
                result = self._compute_for_user(intern, analytics_service, force)
                if result == 'computed':
                    computed += 1
                elif result == 'skipped':
                    skipped += 1
                else:
                    failed += 1
            
            self.stdout.write(self.style.SUCCESS(
                f'\nSummary: {computed} computed, {skipped} skipped, {failed} failed'
            ))

    def _compute_for_user(self, user, analytics_service, force):
        """Compute intelligence for a single user."""
        # Check if user has resume data
        resume_data = ResumeData.objects.filter(user=user).first()
        
        if not resume_data:
            self.stdout.write(
                self.style.WARNING(
                    f'Skipping {user.email}: No resume data found'
                )
            )
            return 'skipped'
        
        # TODO: Check model_predictions table instead of InternIntelligence
        # This will be implemented with the new schema
        # from apps.analytics.models import InternIntelligence
        # intelligence_exists = InternIntelligence.objects.filter(user=user).exists()
        
        # if intelligence_exists and not force:
        #     self.stdout.write(
        #         self.style.WARNING(
        #             f'Skipping {user.email}: Intelligence already exists (use --force to recompute)'
        #         )
        #     )
        #     return 'skipped'
        
        # Compute intelligence
        try:
            result = analytics_service.compute_intern_intelligence(user.id)
            
            if result:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Computed intelligence for {user.email}'
                    )
                )
                return 'computed'
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f'Failed to compute intelligence for {user.email}: No result returned'
                    )
                )
                return 'failed'
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to compute intelligence for {user.email}: {str(e)}'
                )
            )
            return 'failed'
