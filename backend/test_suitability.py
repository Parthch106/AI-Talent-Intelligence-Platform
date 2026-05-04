import os
import django
import sys
import logging

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Configure logging to see our DEBUG prints
logging.basicConfig(level=logging.INFO)

from apps.accounts.models import User
from apps.analytics.services.talent_intelligence_service import talent_intelligence_service

def test_analysis():
    email = "parthdchauhan106@gmail.com"
    job_role = "ML Engineer"
    
    try:
        user = User.objects.get(email=email)
        print(f"\nStarting test analysis for {email} as {job_role}...")
        
        # This will trigger the full pipeline including parsing (if no cached data),
        # feature engineering, embeddings (via API), and ML inference.
        result = talent_intelligence_service.analyze_resume(user, job_role)
        
        print("\n" + "="*60)
        print("TEST RESULTS")
        print("="*60)
        import json
        print(json.dumps(result, indent=2))
        print("="*60)
        
    except User.DoesNotExist:
        print(f"User {email} not found. Please ensure the user exists in the database.")
    except Exception as e:
        print(f"Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_analysis()
