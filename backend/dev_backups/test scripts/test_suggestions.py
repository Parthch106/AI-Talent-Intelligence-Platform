import os
import django
import sys

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend', 'core'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.services.llm_project_generator import LLMProjectGenerator

def test_suggestions(department, duration):
    print(f"\n--- Testing Suggestions for {department} ({duration}) ---")
    generator = LLMProjectGenerator()
    try:
        result = generator.generate_project_suggestions(
            department=department,
            experience_level="INTERMEDIATE",
            num_suggestions=1,
            duration=duration
        )
        for project in result.get('projects', []):
            print(f"Project Name: {project.get('name')}")
            print(f"Duration: {project.get('estimated_duration')} weeks")
            print(f"Modules: {len(project.get('modules', []))}")
            print(f"Description: {project.get('description')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_suggestions("Mobile Development", "2 months")
    test_suggestions("Data Science", "1 month")
    test_suggestions("Web Development", "6 months")
