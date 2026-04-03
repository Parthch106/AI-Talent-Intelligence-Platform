import os
import django
import sys
from datetime import datetime

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import TaskTracking, SkillProfile, LearningPath, JobRole
from apps.analytics.services.learning_path_optimizer import PREREQUISITE_GRAPH, generate_and_save_path

def seed_task_skills():
    print("--- Seeding Skills for Tasks ---")
    tasks = TaskTracking.objects.all()
    updated_count = 0
    
    # Simple keyword mapping based on PREREQUISITE_GRAPH keys
    available_skills = list(PREREQUISITE_GRAPH.keys())
    
    for task in tasks:
        if not task.skills_required:
            matched_skills = []
            content = (task.title + " " + task.description).lower()
            
            for skill in available_skills:
                if skill.lower() in content:
                    matched_skills.append(skill)
            
            # Fallbacks for common variations
            if "rest api" in content or "endpoint" in content:
                if "REST APIs" not in matched_skills: matched_skills.append("REST APIs")
            if "database" in content or "model" in content:
                if "SQL" not in matched_skills: matched_skills.append("SQL")
            
            if matched_skills:
                task.skills_required = list(set(matched_skills))
                task.save(update_fields=['skills_required'])
                updated_count += 1
    
    print(f"Updated {updated_count} tasks with skills.")

def seed_intern_profiles():
    print("\n--- Seeding Intern Skill Profiles ---")
    interns = User.objects.filter(role=User.Role.INTERN)
    
    # Broadened range of tasks to cover more skills found in default paths
    default_task_templates = [
        {"title": "Initial Backend Setup with Django", "description": "Setting up models, views and serializers for the project.", "skills": ["Python", "Django", "SQL", "Linux Basics"]},
        {"title": "Frontend Component Development", "description": "Creating reusable UI components with React and TypeScript.", "skills": ["React", "TypeScript", "JavaScript", "CSS"]},
        {"title": "API Implementation and Documentation", "description": "Developing REST endpoints and documenting with Swagger.", "skills": ["REST APIs", "Django REST Framework", "Git"]},
        {"title": "System Architecture and Algorithms", "description": "Designing efficient data processing pipelines using core algorithms.", "skills": ["Data Structures", "Algorithms", "Docker"]},
        {"title": "Data Modeling and Migration", "description": "Designing complex database schemas and handling data migrations.", "skills": ["SQL", "PostgreSQL", "Data Modeling"]}
    ]
    
    for intern in interns:
        print(f"Processing Intern: {intern.email} (ID: {intern.id})")
        
        # 1. Ensure tasks covering ALL templates exist
        print(f"  - Verifying task coverage for {intern.email}...")
        import uuid
        import random
        from django.utils import timezone
        
        for i, template in enumerate(default_task_templates):
            # Check if a task with similar title already exists
            if not TaskTracking.objects.filter(intern=intern, title__iexact=template["title"]).exists():
                TaskTracking.objects.create(
                    intern=intern,
                    task_id=f"SEED-{intern.id}-{i}-{uuid.uuid4().hex[:4]}",
                    title=template["title"],
                    description=template["description"],
                    status='COMPLETED',
                    priority='MEDIUM',
                    skills_required=template["skills"],
                    due_date=timezone.now(),
                    completed_at=timezone.now(),
                    quality_rating=random.uniform(3.5, 5.0),
                    actual_hours=random.uniform(4, 16)
                )
        
        # 2. Re-calculate and Update SkillProfile
        completed_tasks = TaskTracking.objects.filter(intern=intern, status='COMPLETED')
        skill_ratings = {}
        
        for task in completed_tasks:
            rating = task.quality_rating or 3.5
            for skill in task.skills_required:
                if skill not in skill_ratings:
                    skill_ratings[skill] = []
                skill_ratings[skill].append(float(rating))
        
        for skill, ratings in skill_ratings.items():
            avg_rating = sum(ratings) / len(ratings)
            mastery = min(avg_rating / 5.0, 1.0)
            
            # Add a bit of randomness for variation
            import random
            mastery = max(0.1, min(0.95, mastery + random.uniform(-0.1, 0.1)))
            
            SkillProfile.objects.update_or_create(
                intern=intern,
                skill_name=skill,
                defaults={'mastery_level': round(mastery, 2)}
            )
            print(f"    * {skill}: {mastery:.2f}")

        # 3. Ensure a standardized LearningPath exists and is active
        # We overwrite "Custom Skill Path" or empty paths to ensure consistency
        role_name = "Full Stack Developer"
        try:
            # Create JobRole if missing
            if not JobRole.objects.filter(role_title__iexact=role_name).exists():
                JobRole.objects.create(
                    role_title=role_name,
                    mandatory_skills=["Python", "Django", "JavaScript", "React", "SQL", "Linux Basics"],
                    preferred_skills=["Docker", "TypeScript", "Data Structures", "Algorithms"]
                )
            
            # Check for existing Full Stack path
            path = LearningPath.objects.filter(intern=intern, target_role_title=role_name).first()
            if not path:
                print(f"  - Generating standardized path: {role_name}")
                generate_and_save_path(intern.id, role_name)
            else:
                # If path exists, just make sure its updated_at is refreshed
                path.save()
                print(f"  - Verified existing path: {role_name}")
                
        except Exception as e:
            print(f"  - ERROR with path: {e}")

if __name__ == "__main__":
    seed_task_skills()
    seed_intern_profiles()
    print("\nSeeding completed successfully.")
