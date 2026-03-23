import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.models import TaskTracking
from django.db.models import Count

def check_task_status(intern_id):
    res = TaskTracking.objects.filter(intern_id=intern_id).values('status').annotate(count=Count('id'))
    print(f"Status breakdown for intern {intern_id}:")
    for r in res:
        print(f"{r['status']}: {r['count']}")

if __name__ == "__main__":
    check_task_status(9)
