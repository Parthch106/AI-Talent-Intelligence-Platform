import os
import sys
import django

sys.path.append(r"e:\CSU Internship\AI_Talent_Intelligence_Platform_V_0.2.1.05.06.26\AIMS-BACKEND")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.analytics.models import TaskTracking

tasks = TaskTracking.objects.all().order_by('-assigned_at')[:2]
for task in tasks:
    print(f"Task ID: {task.task_id}")
    print(f"Assigned At: {task.assigned_at}")
    print(f"Description:\n{repr(task.description)}")
    print("-" * 50)
