"""
Media Upload API — /media/upload/
==================================
A lightweight endpoint that accepts any file upload and stores it in AWS S3
(or local media when USE_AWS_S3 is False).

Endpoint:
    POST /media/upload/
    Content-Type: multipart/form-data

Body parameters:
    file         (required) — the file to upload
    folder       (optional) — S3 sub-folder (default: "uploads")
    company      (optional) — company / tenant name used to namespace the key

Response (success 200):
    {
        "key":  "uploads/Global/2026/uploads/<uuid>_filename.pdf",
        "url":  "https://<cloudfront>.cloudfront.net/uploads/...",
        "name": "original_filename.pdf"
    }

Response (error):
    { "error": "<message>" }
"""

import logging

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status as drf_status

from core.aws_s3_service import get_s3_service

logger = logging.getLogger(__name__)


class MediaUploadView(APIView):
    """
    POST /media/upload/
    Accepts a multipart file and uploads it to S3 (or local storage).
    Returns the S3 key and a public/CDN URL.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file provided.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        folder  = request.data.get('folder', 'uploads')
        company = request.data.get('company', None)

        use_s3 = getattr(settings, 'USE_AWS_S3', False)

        if use_s3:
            s3 = get_s3_service()
            s3_key = s3.upload_file(uploaded_file, folder_name=folder, company_name=company)

            if not s3_key:
                return Response(
                    {'error': 'Upload to S3 failed. Check AWS credentials and bucket configuration.'},
                    status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            public_url = s3.get_media_url(s3_key)

            return Response({
                'key':  s3_key,
                'url':  public_url,
                'name': uploaded_file.name,
            }, status=drf_status.HTTP_200_OK)

        else:
            # Fallback: save to local media using Django's default storage
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile

            save_path = f'{folder}/{uploaded_file.name}'
            path = default_storage.save(save_path, ContentFile(uploaded_file.read()))
            url  = request.build_absolute_uri(settings.MEDIA_URL + path)

            return Response({
                'key':  path,
                'url':  url,
                'name': uploaded_file.name,
            }, status=drf_status.HTTP_200_OK)


class S3HealthCheckView(APIView):
    """
    GET /media/health/
    Returns S3 connectivity status. Admin-only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required.'}, status=drf_status.HTTP_403_FORBIDDEN)

        use_s3 = getattr(settings, 'USE_AWS_S3', False)
        if not use_s3:
            return Response({'status': 'S3 is disabled (USE_AWS_S3=False). Using local media storage.'})

        s3 = get_s3_service()
        ok, message = s3.check_service()
        return Response(
            {'status': message},
            status=drf_status.HTTP_200_OK if ok else drf_status.HTTP_503_SERVICE_UNAVAILABLE,
        )
