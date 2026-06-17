import os
import django

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import traceback

print("Default storage class:", default_storage.__class__.__name__)
try:
    file_name = default_storage.save('test_s3_upload.txt', ContentFile(b'S3 Upload test from AIMS.'))
    print("Successfully uploaded to:", file_name)
    url = default_storage.url(file_name)
    print("File URL:", url)
except Exception as e:
    print("Failed to upload:")
    traceback.print_exc()
