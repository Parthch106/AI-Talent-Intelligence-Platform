"""
Management command: check_s3
Usage: python manage.py check_s3

Verifies that Django can reach the configured S3 bucket using the
credentials in .env / environment variables.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from core.aws_s3_service import get_s3_service


class Command(BaseCommand):
    help = 'Check AWS S3 connectivity and credentials.'

    def handle(self, *args, **options):
        use_s3 = getattr(settings, 'USE_AWS_S3', False)

        if not use_s3:
            self.stdout.write(self.style.WARNING(
                'USE_AWS_S3 is False. S3 is disabled — using local media storage.\n'
                'Set USE_AWS_S3=True in .env to enable S3 uploads.'
            ))
            return

        bucket = getattr(settings, 'AWS_BUCKET_NAME', '')
        region = getattr(settings, 'AWS_REGION', 'us-east-1')
        cloudfront = getattr(settings, 'AWS_CLOUDFRONT_BASE_URL', '') or '(not set)'

        self.stdout.write(f'  Bucket  : {bucket}')
        self.stdout.write(f'  Region  : {region}')
        self.stdout.write(f'  CDN URL : {cloudfront}')
        self.stdout.write('Connecting …')

        s3 = get_s3_service()
        
        self.stdout.write('Attempting to upload a test file to verify permissions...')
        test_key = s3.upload_bytes(b'Test file content for connection check', 'health_check_test.txt', 'test')
        
        if test_key:
            self.stdout.write(self.style.SUCCESS(f'AWS S3 connection is healthy! Uploaded test file: {test_key}'))
            # Clean it up right away
            if s3.delete_file(test_key):
                self.stdout.write('Test file cleaned up successfully.')
        else:
            self.stderr.write(self.style.ERROR('AWS S3 connection failed! Could not upload test file.'))
