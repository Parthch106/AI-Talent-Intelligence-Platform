import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import SkillProfile, LearningPath

def check():
    interns = User.objects.filter(role=User.Role.INTERN)
    print(f"Total Interns: {interns.count()}")
    
    for intern in interns:
        print(f"\n--- Intern: {intern.email} (ID: {intern.id}) ---")
        
        # Check Skills
        skills = SkillProfile.objects.filter(intern=intern)
        print(f"Skills Profile count: {skills.count()}")
        for s in skills:
            print(f"  - {s.skill_name}: {s.mastery_level}")
            
        # Check Active Learning Path
        path = LearningPath.objects.filter(intern=intern).order_by('-updated_at').first()
        if path:
            print(f"Active Path ID: {path.id} (updated: {path.updated_at})")
            print(f"Target Role: {path.target_role_title}")
            milestones = path.milestones
            print(f"Milestones count: {len(milestones)}")
            for m in milestones:
                skill = m.get('skill', m.get('area', 'Unknown'))
                mastery = m.get('current_mastery', 0.0)
                print(f"  - {skill}: {mastery}")
        else:
            print("No Learning Path found.")

if __name__ == "__main__":
    check()
