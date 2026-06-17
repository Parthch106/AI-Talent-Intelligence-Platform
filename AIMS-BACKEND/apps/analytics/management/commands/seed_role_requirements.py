"""
This command is deprecated.
Role requirements are now stored in the new job_roles table (see INTERN_ANALYSIS_SCHEMA.md).
Use the new Django models instead.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'DEPRECATED: Use new job_roles table instead. See INTERN_ANALYSIS_SCHEMA.md'

    def handle(self, *args, **kwargs):
        self.stdout.write(
            self.style.WARNING(
                'This command is deprecated. '
                'Role requirements are now stored in the job_roles table. '
                'See django_pg_backend/core/docs/INTERN_ANALYSIS_SCHEMA.md for the new schema.'
            )
        )
