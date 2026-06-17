"""
AWS S3 Service for AI Talent Intelligence Platform (Django/Python Backend)
==========================================================================
Provides upload, download (pre-signed URL), CloudFront URL generation,
deletion, and health-check operations against an S3 bucket.

Configuration is read from Django settings / environment variables:
    AWS_REGION              — e.g. "ca-central-1"
    AWS_BUCKET_NAME         — S3 bucket name
    AWS_ACCESS_KEY_ID       — IAM access key  (leave blank to use instance/env chain)
    AWS_SECRET_ACCESS_KEY   — IAM secret key
    AWS_SESSION_TOKEN       — Optional: temporary session token
    AWS_CLOUDFRONT_BASE_URL — Optional: CloudFront distribution URL
"""

import os
import re
import uuid
import logging
from io import BytesIO
from typing import Optional, Tuple

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


class AwsS3Service:
    """
    Singleton-friendly service for AWS S3 interactions.

    Usage (direct instantiation):
        s3 = AwsS3Service()
        key  = s3.upload_file(request.FILES['file'], folder_name='resumes', company_name='AIMS')
        url  = s3.get_media_url(key)

    Usage (lazy singleton via module-level helper):
        from core.aws_s3_service import get_s3_service
        s3 = get_s3_service()
    """

    def __init__(self):
        self._bucket_name: str = getattr(settings, 'AWS_BUCKET_NAME', os.getenv('AWS_BUCKET_NAME', ''))
        self._region: str = getattr(settings, 'AWS_REGION', os.getenv('AWS_REGION', 'us-east-1'))
        self._cloudfront_base_url: str = (
            getattr(settings, 'AWS_CLOUDFRONT_BASE_URL', os.getenv('AWS_CLOUDFRONT_BASE_URL', ''))
        ).rstrip('/')

        access_key: str = getattr(settings, 'AWS_ACCESS_KEY_ID', os.getenv('AWS_ACCESS_KEY_ID', ''))
        secret_key: str = getattr(settings, 'AWS_SECRET_ACCESS_KEY', os.getenv('AWS_SECRET_ACCESS_KEY', ''))
        session_token: Optional[str] = getattr(settings, 'AWS_SESSION_TOKEN', os.getenv('AWS_SESSION_TOKEN')) or None

        boto_kwargs = {
            'region_name': self._region,
        }

        if access_key and secret_key:
            boto_kwargs['aws_access_key_id'] = access_key
            boto_kwargs['aws_secret_access_key'] = secret_key
            if session_token:
                boto_kwargs['aws_session_token'] = session_token
            logger.info('[S3] Initialised with explicit IAM credentials.')
        else:
            # Fall back to boto3 credential chain (IAM role / env vars / ~/.aws)
            logger.info('[S3] No explicit credentials — using boto3 credential chain (IAM role / env / config).')

        self._s3_client = boto3.client('s3', **boto_kwargs)

    # ------------------------------------------------------------------
    # Upload
    # ------------------------------------------------------------------

    def upload_file(
        self,
        file_obj,
        folder_name: str,
        company_name: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> str:
        """
        Upload a file-like object (Django InMemoryUploadedFile / TemporaryUploadedFile,
        or any object with a `name` attribute and readable stream) to S3.

        Returns the S3 object key (relative path) on success, or '' on failure.
        """
        try:
            original_name = getattr(file_obj, 'name', 'upload')
            detected_content_type = content_type or getattr(file_obj, 'content_type', 'application/octet-stream')
            unique_key = self._build_key(original_name, folder_name, company_name)

            # Reset stream to beginning if possible
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            self._s3_client.upload_fileobj(
                file_obj,
                self._bucket_name,
                unique_key,
                ExtraArgs={'ContentType': detected_content_type},
            )
            logger.info(f'[S3] Uploaded → {unique_key}')
            return unique_key
        except (BotoCoreError, ClientError) as exc:
            logger.error(f'[S3 ERROR] Upload failed: {exc}')
            return ''

    def upload_bytes(
        self,
        data: bytes,
        filename: str,
        folder_name: str,
        content_type: str = 'application/octet-stream',
        company_name: Optional[str] = None,
    ) -> str:
        """
        Upload raw bytes to S3.  Useful for programmatically generated files
        (PDF certificates, exports, etc.).

        Returns the S3 object key on success, or '' on failure.
        """
        try:
            unique_key = self._build_key(filename, folder_name, company_name)
            self._s3_client.upload_fileobj(
                BytesIO(data),
                self._bucket_name,
                unique_key,
                ExtraArgs={'ContentType': content_type},
            )
            logger.info(f'[S3] Uploaded bytes → {unique_key}')
            return unique_key
        except (BotoCoreError, ClientError) as exc:
            logger.error(f'[S3 ERROR] Byte upload failed: {exc}')
            return ''

    # ------------------------------------------------------------------
    # URL Generation
    # ------------------------------------------------------------------

    def get_presigned_url(self, s3_key: str, expiration_seconds: int = 3600) -> str:
        """
        Generate a temporary pre-signed URL that grants read access to a private
        S3 object for `expiration_seconds` (default 1 hour).

        If CloudFront is configured, returns a CloudFront URL instead (public CDN).
        Falls back to '/<s3_key>' on error.
        """
        if not s3_key:
            return ''
        if s3_key.startswith('http'):
            return s3_key  # Already a full URL

        # Prefer CloudFront when available (no expiry needed if bucket is private+CF)
        if self._cloudfront_base_url:
            return self.get_media_url(s3_key)

        try:
            url = self._s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self._bucket_name,
                    'Key': s3_key.lstrip('/'),
                },
                ExpiresIn=expiration_seconds,
            )
            return url
        except (BotoCoreError, ClientError) as exc:
            logger.error(f'[S3 ERROR] Pre-signed URL failed: {exc}')
            return f'/{s3_key.lstrip("/")}'

    def get_media_url(self, path: Optional[str]) -> str:
        """
        Convert an S3 key (or legacy full amazonaws.com URL) into a
        fast CloudFront CDN URL when configured, otherwise returns the
        original path unchanged.
        """
        if not path:
            return ''

        # Strip legacy full S3 endpoint URLs down to the key
        if 'amazonaws.com' in path:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(path)
                path = parsed.path.lstrip('/')
            except Exception:
                pass

        key = path.lstrip('/')

        if self._cloudfront_base_url:
            return f'{self._cloudfront_base_url}/{key}'

        return path

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete_file(self, s3_key: str) -> bool:
        """
        Delete an object from S3.  Returns True on success, False otherwise.
        """
        if not s3_key:
            return False
        try:
            self._s3_client.delete_object(
                Bucket=self._bucket_name,
                Key=s3_key.lstrip('/'),
            )
            logger.info(f'[S3] Deleted → {s3_key}')
            return True
        except (BotoCoreError, ClientError) as exc:
            logger.error(f'[S3 ERROR] Delete failed: {exc}')
            return False

    # ------------------------------------------------------------------
    # Health Check
    # ------------------------------------------------------------------

    def check_service(self) -> Tuple[bool, str]:
        """
        Verify AWS credentials and connectivity by listing one key in the bucket.

        Returns (True, success_message) or (False, error_message).
        """
        try:
            self._s3_client.list_objects_v2(Bucket=self._bucket_name, MaxKeys=1)
            return True, 'AWS S3 connection is healthy ✅'
        except ClientError as exc:
            code = exc.response.get('Error', {}).get('Code', 'Unknown')
            return False, f'AWS S3 ClientError: {exc} (Code: {code})'
        except BotoCoreError as exc:
            return False, f'AWS S3 BotoCoreError: {exc}'
        except Exception as exc:
            return False, f'AWS S3 connection failed: {exc}'

    # ------------------------------------------------------------------
    # Internal Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _sanitize_folder_name(name: str) -> str:
        """Replace whitespace with underscores and strip non-alphanumeric chars."""
        if not name:
            return 'Default'
        clean = re.sub(r'\s+', '_', name)
        clean = re.sub(r'[^a-zA-Z0-9_\-]', '', clean)
        return clean or 'Default'

    @staticmethod
    def _unique_filename(original_name: str) -> str:
        """Prepend a UUID4 hex to the original filename to guarantee uniqueness."""
        base = os.path.splitext(original_name)[0]
        ext = os.path.splitext(original_name)[1]
        safe_base = re.sub(r'[^a-zA-Z0-9_\-]', '_', base)[:50]
        return f'{safe_base}_{uuid.uuid4().hex}{ext}'

    def _build_key(
        self,
        original_name: str,
        folder_name: str,
        company_name: Optional[str],
    ) -> str:
        """
        Build the S3 object key following the convention:
            uploads/<CompanyFolder>/<Year>/<subfolder>/<unique_filename>
        """
        from datetime import datetime
        unique_name = self._unique_filename(original_name)
        company_folder = self._sanitize_folder_name(company_name) if company_name else 'Global'
        current_year = datetime.utcnow().year

        # Strip leading "uploads/" if caller already included it
        target_folder = folder_name.strip('/')
        if target_folder.startswith('uploads/'):
            target_folder = target_folder[len('uploads/'):].lstrip('/')

        if target_folder:
            return f'uploads/{company_folder}/{current_year}/{target_folder}/{unique_name}'
        return f'uploads/{company_folder}/{current_year}/{unique_name}'


# ---------------------------------------------------------------------------
# Module-level lazy singleton
# ---------------------------------------------------------------------------
_s3_service_instance: Optional[AwsS3Service] = None


def get_s3_service() -> AwsS3Service:
    """
    Return the module-level singleton AwsS3Service.
    Instantiated lazily on first call so that the service is only created when
    actually needed (and after Django settings are fully loaded).
    """
    global _s3_service_instance
    if _s3_service_instance is None:
        _s3_service_instance = AwsS3Service()
    return _s3_service_instance
