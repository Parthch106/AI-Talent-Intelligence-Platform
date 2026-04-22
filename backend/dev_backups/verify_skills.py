import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import SkillProfile, LearningPath
from apps.analytics.services.learning_path_optimizer import get_path_progress

def verify_all_interns():
    interns = User.objects.filter(role=User.Role.INTERN)
    print(f"Total Interns: {interns.count()}")
    
    for intern in interns:
        print(f"\nIntern: {intern.email} (ID: {intern.id})")
        
        # Check SkillProfile
        profiles = SkillProfile.objects.filter(intern=intern)
        print(f"  Skill Profiles: {profiles.count()}")
        for sp in profiles[:3]:
            print(f"    - {sp.skill_name}: {sp.mastery_level}")
            
        # Check LearningPath
        path = LearningPath.objects.filter(intern=intern).first()
        if path:
            print(f"  Learning Path: {path.target_role_title}")
            print(f"  Completion: {path.completion_percentage}%")
            
            # Check API response data
            progress = get_path_progress(intern.id)
            if progress:
                # Count milestones with mastery > 0
                mastered = [m for m in progress['milestones'] if m.get('current_mastery', 0) > 0]
                print(f"  API Milestones with mastery: {len(mastered)}")
            else:
                print("  API progress call returned None")
        else:
            print("  NO LEARNING PATH FOUND")

if __name__ == "__main__":
    verify_all_interns()
