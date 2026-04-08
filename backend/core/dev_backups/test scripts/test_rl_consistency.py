import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.services.rl_task_assigner import get_optimal_difficulty
from apps.accounts.models import User

def test_consistency(intern_id):
    results = []
    for i in range(10):
        results.append(get_optimal_difficulty(intern_id))
    
    print(f"Results for intern {intern_id}: {results}")
    if len(set(results)) == 1:
        print("PASS: Consistency achieved.")
    else:
        print("FAIL: Results are fluctuating!")

if __name__ == "__main__":
    # Get the first intern in the DB
    intern = User.objects.filter(role='INTERN').first()
    if intern:
        test_consistency(intern.id)
    else:
        print("No intern found in DB to test.")
