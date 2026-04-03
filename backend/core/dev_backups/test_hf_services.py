import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.services.llm_task_generator import get_task_generator
from apps.projects.services.llm_project_generator import get_project_generator

def test_task_generator():
    print("\n--- Testing LLMTaskGenerator ---")
    gen = get_task_generator()
    try:
        # Minimal data for testing
        result = gen.generate_task_suggestions(
            intern_name="Test Intern",
            intern_skills=["Python"],
            completed_tasks=[],
            ongoing_tasks=[],
            num_suggestions=1
        )
        
        if "error" in result:
            print(f"Task Gen FAILED: {result['error']}")
            if "401" in str(result['error']):
                print("STILL GETTING 401 UNAUTHORIZED")
        else:
            print("Task Gen SUCCESS")
            print(f"Summary: {result.get('summary')}")
    except Exception as e:
        print(f"Task Gen EXCEPTION: {e}")

def test_project_generator():
    print("\n--- Testing LLMProjectGenerator ---")
    gen = get_project_generator()
    try:
        result = gen.generate_project_suggestions(
            department="Web Development",
            experience_level="BEGINNER",
            num_suggestions=1
        )
        
        if "error" in result:
            print(f"Project Gen FAILED: {result['error']}")
        else:
            print("Project Gen SUCCESS")
            print(f"Projects count: {len(result.get('projects', []))}")
    except Exception as e:
        print(f"Project Gen EXCEPTION: {e}")

if __name__ == "__main__":
    test_task_generator()
    test_project_generator()
