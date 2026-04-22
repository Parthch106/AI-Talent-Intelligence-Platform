import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import TaskTracking

def check_intern_16():
    try:
        intern = User.objects.get(id=16)
        print(f"Intern: {intern.email}")
        tasks = TaskTracking.objects.filter(intern=intern)
        print(f"Total Tasks: {tasks.count()}")
        for task in tasks:
            print(f"  - {task.title} | Status: {task.status}")
    except User.DoesNotExist:
        print("Intern 16 does not exist")

if __name__ == "__main__":
    check_intern_16()
