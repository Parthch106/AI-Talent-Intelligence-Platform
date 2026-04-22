import os
import django
import sys
import json

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.services.performance_evaluator import evaluate_intern_performance
from apps.analytics.models import AttendanceRecord
from django.db.models import Count

def verify_performance(intern_id):
    try:
        res = evaluate_intern_performance(intern_id)
        attendance_counts = list(AttendanceRecord.objects.filter(intern_id=intern_id).values('status').annotate(count=Count('id')))
        
        print("Performance Metrics for Intern 9:")
        print(json.dumps({
            'performance_score': res.get('performance_score'),
            'metrics': res.get('metrics'),
            'attendance_counts': attendance_counts
        }, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    intern_id = 9
    if len(sys.argv) > 1:
        try:
            # Handle both --intern-id X and just X
            if sys.argv[1] == '--intern-id' and len(sys.argv) > 2:
                intern_id = int(sys.argv[2])
            else:
                intern_id = int(sys.argv[1])
        except ValueError:
            pass
            
    verify_performance(intern_id)
