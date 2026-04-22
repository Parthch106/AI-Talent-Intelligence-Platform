#!/usr/bin/env python
"""
Test script for task generator fallback mechanism.
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.services.llm_task_generator import get_task_generator

def test_task_generator_fallback():
    """Test the task generator fallback functionality."""
    print("Testing Task Generator Fallback...")
    print("=" * 50)

    try:
        # Get the task generator
        generator = get_task_generator()
        print("[OK] LLM Task Generator initialized")

        # Test generating task suggestions
        print("\nGenerating task suggestions...")
        result = generator.generate_task_suggestions(
            intern_name='John Doe',
            intern_skills=['HTML', 'CSS', 'JavaScript'],
            completed_tasks=[],
            ongoing_tasks=[],
            module_name='Frontend Development',
            num_suggestions=2
        )

        if 'error' in result:
            print(f"[ERROR] Error: {result['error']}")
            return False

        tasks = result.get('tasks', [])
        print(f"[OK] Generated {len(tasks)} task suggestions")

        # Display results
        for i, task in enumerate(tasks, 1):
            print(f"\n--- Task {i}: {task.get('title', 'N/A')} ---")
            print(f"Description: {task.get('description', 'N/A')[:100]}...")
            print(f"Difficulty: {task.get('difficulty', 'N/A')}/5")
            print(f"Estimated Hours: {task.get('estimated_hours', 'N/A')}")
            print(f"Skills Required: {', '.join(task.get('skills_required', []))}")
            print(f"Rationale: {task.get('rationale', 'N/A')}")

        print("\n[SUCCESS] Task Generator fallback test completed successfully!")
        return True

    except Exception as e:
        print(f"[FAILED] Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_task_generator_fallback()
    sys.exit(0 if success else 1)