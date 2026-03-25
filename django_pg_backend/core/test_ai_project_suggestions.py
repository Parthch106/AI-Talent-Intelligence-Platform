#!/usr/bin/env python
"""
Test script for AI-powered project suggestion feature.
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.services.llm_project_generator import get_project_generator

def test_ai_project_suggestions():
    """Test the AI project suggestion functionality."""
    print("Testing AI Project Suggestions...")
    print("=" * 50)

    try:
        # Get the project generator
        generator = get_project_generator()
        print("[OK] LLM Project Generator initialized")

        # Test JSON parsing with a complete response
        print("\nTesting JSON parsing...")
        test_content = '''{
  "projects": [
    {
      "name": "To-Do List App",
      "description": "A simple to-do list app that allows users to add, remove, and edit tasks.",
      "estimated_duration": 2,
      "difficulty": 2,
      "tech_stack": ["HTML", "CSS", "JavaScript"],
      "learning_objectives": ["Learn HTML", "Learn CSS", "Learn JavaScript"],
      "business_value": "Builds web development skills",
      "modules": [
        {
          "name": "Setup",
          "description": "Project setup and initialization",
          "estimated_hours": 4
        }
      ]
    }
  ],
  "summary": "Test project"
}'''

        parsed = generator._parse_llm_response(test_content)
        if parsed.get('projects'):
            print("[OK] JSON parsing works correctly")
        else:
            print("[ERROR] JSON parsing failed")
            return False

        # Test generating suggestions for Web Development
        print("\nGenerating project suggestions for 'Web Development' department...")
        result = generator.generate_project_suggestions(
            department="Web Development",
            experience_level="BEGINNER",
            num_suggestions=1
        )

        if 'error' in result:
            print(f"[ERROR] Error: {result['error']}")
            return False

        projects = result.get('projects', [])
        print(f"[OK] Generated {len(projects)} project suggestions")

        # Display results
        for i, project in enumerate(projects, 1):
            print(f"\n--- Project {i}: {project.get('name', 'N/A')} ---")
            print(f"Description: {project.get('description', 'N/A')[:100]}...")
            print(f"Duration: {project.get('estimated_duration', 'N/A')} weeks")
            print(f"Difficulty: {project.get('difficulty', 'N/A')}/5")
            print(f"Tech Stack: {', '.join(project.get('tech_stack', []))}")
            print(f"Learning Objectives: {len(project.get('learning_objectives', []))} items")
            print(f"Modules: {len(project.get('modules', []))} modules")

        print("\n[SUCCESS] AI Project Suggestions test completed successfully!")
        return True

    except Exception as e:
        print(f"[FAILED] Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_ai_project_suggestions()
    sys.exit(0 if success else 1)