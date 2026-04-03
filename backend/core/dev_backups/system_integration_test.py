import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.interns.models import InternProfile
from apps.analytics.services.performance_evaluator import PerformanceEvaluator
from apps.analytics.services.rl_task_assigner import assign_task_recommendation_greedy

def run_system_test():
    print("=== Starting System Integration Test ===")
    
    # 1. Create a New Intern
    email = "test_intern_2026@example.com"
    User.objects.filter(email=email).delete()
    
    user = User.objects.create(
        email=email,
        full_name="Test Intern 2026",
        role=User.Role.INTERN,
        department="Engineering"
    )
    user.set_password("password123")
    user.save()
    
    profile = InternProfile.objects.create(
        user=user,
        university="Global Tech University",
        skills=["Python", "React", "Django"],
        status='ACTIVE'
    )
    
    print(f"Step 1: Created Intern ID {user.id} ({user.full_name})")
    
    # 2. Test Performance Analytics (Zero State)
    evaluator = PerformanceEvaluator(user.id)
    metrics = evaluator.get_performance_metrics()
    
    print("\nStep 2: Performance Analytics (Zero State)")
    print(f" - Quality Score: {metrics.quality_score} (Expected: 0.0)")
    print(f" - Completion Rate: {metrics.completion_rate} (Expected: 0.0)")
    print(f" - Growth Velocity: {metrics.growth_velocity} (Expected: 0.0)")
    print(f" - Engagement: {metrics.engagement} (Expected: 0.0)")
    
    # 3. Test RL Task Recommendation (New Intern)
    # The RL agent should still be able to recommend tasks based on skills even with no history
    try:
        recommendations = assign_task_recommendation_greedy(user.id)
        print("\nStep 3: RL Task Recommendations")
        print(f" - Found {len(recommendations)} recommended tasks")
        for i, task in enumerate(recommendations[:3]):
            print(f"   [{i+1}] {task.get('task_title')} (Difficulty: {task.get('difficulty_level')})")
    except Exception as e:
        print(f"\nStep 3: RL Task Recommendations FAILED: {e}")

    # 4. Check Learning Path
    try:
        from apps.analytics.services.learning_path_optimizer import get_path_progress
        path_progress = get_path_progress(user.id)
        print("\nStep 4: Learning Path Status")
        print(f" - Path Progress: {path_progress}")
    except Exception as e:
        print(f"\nStep 4: Learning Path Check FAILED: {e}")

    # 5. Simulate Activity: Mark Multiple Attendance Records
    print("\nStep 5: Simulating 5 Days of Attendance")
    from apps.analytics.models import AttendanceRecord, TaskTracking
    attendance_data = [
        (0, 'PRESENT'), (1, 'PRESENT'), (2, 'LATE'), (3, 'ABSENT'), (4, 'PRESENT')
    ]
    for days_back, status in attendance_data:
        AttendanceRecord.objects.get_or_create(
            intern=user,
            date=timezone.now().date() - timedelta(days=days_back),
            defaults={'status': status}
        )
    print(" - Marked 5 days: 3 Present, 1 Late, 1 Absent")

    # 6. Simulate Activity: Multiple Tasks
    print("\nStep 6: Simulating Multiple Tasks (Mixed Performance)")
    task_configs = [
        ("High Quality Task", 'COMPLETED', 5.0, 4, 0),    # Completed today
        ("Medium Quality Task", 'COMPLETED', 3.0, 8, -2), # Completed 2 days ago
        ("In Progress Task", 'IN_PROGRESS', None, 6, -1), # Assigned 1 day ago
        ("Overdue Task", 'ASSIGNED', None, 4, -10),      # Overdue
    ]
    
    for title, status, quality, hours, days_offset in task_configs:
        TaskTracking.objects.create(
            intern=user,
            task_id=f"TASK-{title.replace(' ', '-')}-{user.id}",
            title=title,
            description="Stress test task",
            status=status,
            assigned_at=timezone.now() + timedelta(days=days_offset),
            due_date=timezone.now() + timedelta(days=days_offset + 3), # 3 day window
            completed_at=timezone.now() if status == 'COMPLETED' else None,
            quality_rating=quality,
            estimated_hours=hours
        )
    print(f" - Created {len(task_configs)} tasks with mixed statuses and ratings.")

    # 7. Re-evaluate Performance
    evaluator = PerformanceEvaluator(user.id)
    new_metrics = evaluator.get_performance_metrics()
    print("\nStep 7: Updated Performance Metrics (Stress Test)")
    print(f" - Quality Score: {new_metrics.quality_score:.2f} (Expected: ~0.80 for 5.0 & 3.0 avg)")
    print(f" - Completion Rate: {new_metrics.completion_rate:.2f} (Expected: 0.50 for 2/4 completed)")
    print(f" - Engagement: {new_metrics.engagement:.2f} (Expected: ~0.80 for 4/5 attendance ratio)")
    print(f" - Growth Velocity: {new_metrics.growth_velocity:.2f} (Expected: ~0.10 for 2 tasks total)")
    
    print("\n=== System Test Summary ===")
    if new_metrics.quality_score > 0 and new_metrics.completion_rate == 1.0:
        print("[PASS] System correctly processes active intern data.")
    else:
        print("[FAIL] System failed to update metrics after activity.")

    print(f"\nCleaning up test user {user.id}...")
    # user.delete() # Comment out if you want to inspect manually in DB
    print("Done.")

if __name__ == "__main__":
    run_system_test()
