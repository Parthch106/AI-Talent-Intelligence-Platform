import os
import django
import sys

# Set up Django environment
sys.path.append('e:/CSU Internship/AI-Talent-Intelligence-Platform/AI-Talent-Intelligence-Platform/backend/core')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.services.talent_intelligence_service import talent_intelligence_service
from apps.analytics.models import ResumeSkill, Application

def verify():
    # Pick an intern
    intern = User.objects.filter(role='INTERN').first()
    if not intern:
        print("No intern found")
        return

    print(f"Testing with intern: {intern.email}")
    
    # Run analysis
    try:
        # We'll use a specific role
        result = talent_intelligence_service.analyze_resume(
            user=intern,
            job_role='ML_ENGINEER',
            create_application=True
        )
        
        # Get the application
        application = Application.objects.filter(intern=intern, job_role__role_title='ML_ENGINEER').first()
        if not application:
            print("No application created")
            return
            
        # Check ResumeSkill categories
        skills = ResumeSkill.objects.filter(application=application)
        print(f"Found {len(skills)} skills")
        
        categories = set(s.category for s in skills)
        print(f"Categories found: {categories}")
        
        if len(categories) > 1:
            print("SUCCESS: Multiple categories found!")
        elif 'programming_languages' in categories and len(categories) == 1:
            print("STILL BUGGY: Only programming_languages found")
        else:
            print(f"Categories: {categories}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify()
