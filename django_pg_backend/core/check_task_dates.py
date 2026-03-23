import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.models import TaskTracking

def check_task_dates(intern_id):
    now = timezone.now()
    start_date = now - timedelta(days=30)
    tasks = TaskTracking.objects.filter(intern_id=intern_id)
    
    print(f"Total tasks for intern {intern_id}: {tasks.count()}")
    print(f"Tasks assigned in last 30 days: {tasks.filter(assigned_at__gte=start_date).count()}")
    
    latest_task = tasks.order_by('-assigned_at').first()
    if latest_task:
        print(f"Latest task assigned at: {latest_task.assigned_at}")
    else:
        print("No tasks found.")
        
    # Check if assigned_at is null for some tasks
    null_assigned = tasks.filter(assigned_at__isnull=True).count()
    print(f"Tasks with NULL assigned_at: {null_assigned}")

if __name__ == "__main__":
    check_task_dates(9)
