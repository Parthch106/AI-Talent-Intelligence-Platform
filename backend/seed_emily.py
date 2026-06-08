import os
import django
from django.utils import timezone
from datetime import timedelta
import random

def seed_data():
    from apps.accounts.models import User
    from apps.analytics.models import (
        TaskTracking, PerformanceMetrics, SkillProfile, MonthlyEvaluationReport
    )

    # 1. Find or create Emily Davis
    user = User.objects.filter(full_name__icontains='Emily Davis', role='INTERN').first()
    if not user:
        user = User.objects.create(
            email='emily.davis@example.com',
            full_name='Emily Davis',
            role='INTERN',
            department='Engineering',
            date_joined=timezone.now() - timedelta(days=90)
        )
        print("Created Emily Davis")
    else:
        # Update date_joined so she has some tenure
        user.date_joined = timezone.now() - timedelta(days=90)
        user.save()
        print(f"Found Emily Davis (ID: {user.id})")

    # Clear existing to prevent duplicates
    TaskTracking.objects.filter(intern_id=user.id).delete()
    SkillProfile.objects.filter(intern_id=user.id).delete()
    MonthlyEvaluationReport.objects.filter(intern_id=user.id).delete()
    PerformanceMetrics.objects.filter(intern_id=user.id).delete()

    # 2. Create TaskTracking records
    import uuid
    tasks = [
        # COMPLETED tasks
        TaskTracking(
            intern_id=user.id,
            task_id=f"TASK-{uuid.uuid4().hex[:6].upper()}",
            title="Implement REST API",
            status="COMPLETED",
            estimated_hours=15,
            quality_rating=4.5,
            rework_required=False,
            due_date=timezone.now() - timedelta(days=5),
            completed_at=timezone.now() - timedelta(days=6)
        ),
        TaskTracking(
            intern_id=user.id,
            task_id=f"TASK-{uuid.uuid4().hex[:6].upper()}",
            title="Database Schema Design",
            status="COMPLETED",
            estimated_hours=8,
            quality_rating=3.8,
            rework_required=True,
            due_date=timezone.now() - timedelta(days=10),
            completed_at=timezone.now() - timedelta(days=9)
        ),
        TaskTracking(
            intern_id=user.id,
            task_id=f"TASK-{uuid.uuid4().hex[:6].upper()}",
            title="Write Unit Tests",
            status="COMPLETED",
            estimated_hours=5,
            quality_rating=5.0,
            rework_required=False,
            due_date=timezone.now() - timedelta(days=2),
            completed_at=timezone.now() - timedelta(days=3)
        ),
        # ACTIVE tasks (one overdue)
        TaskTracking(
            intern_id=user.id,
            task_id=f"TASK-{uuid.uuid4().hex[:6].upper()}",
            title="Fix Authentication Bug",
            status="IN_PROGRESS",
            estimated_hours=4,
            due_date=timezone.now() - timedelta(days=1), # OVERDUE
        ),
        TaskTracking(
            intern_id=user.id,
            task_id=f"TASK-{uuid.uuid4().hex[:6].upper()}",
            title="Update Documentation",
            status="ASSIGNED",
            estimated_hours=2,
            due_date=timezone.now() + timedelta(days=2), # FUTURE
        ),
    ]
    TaskTracking.objects.bulk_create(tasks)
    print("Created TaskTracking records")

    # 3. Create SkillProfile records
    skills = ['Python', 'Django', 'React', 'TypeScript', 'SQL', 'Git', 'Docker', 'REST APIs', 'Unit Testing', 'Communication']
    skill_objs = [
        SkillProfile(
            intern_id=user.id,
            skill_name=skill,
            mastery_level=random.uniform(60, 95)
        )
        for skill in skills
    ]
    SkillProfile.objects.bulk_create(skill_objs)
    print("Created SkillProfile records")

    # 4. Create MonthlyEvaluationReport
    MonthlyEvaluationReport.objects.create(
        intern_id=user.id,
        evaluation_month=timezone.now().date().replace(day=1),
        period_start=timezone.now().date() - timedelta(days=30),
        period_end=timezone.now().date(),
        overall_performance_score=85,
        performance_grade="A",
        skill_development_progress=75.5, # Growth velocity
        mentor_feedback_summary="Emily has shown great progress."
    )
    print("Created MonthlyEvaluationReport")

    # 5. Create PerformanceMetrics
    PerformanceMetrics.objects.create(
        intern_id=user.id,
        period_start=timezone.now() - timedelta(days=30),
        period_end=timezone.now(),
        overall_performance_score=88.5,
        engagement_score=92.0,
        dropout_risk_score=15.0, # Low risk
        productivity_score=85.0,
        quality_score=90.0,
    )
    print("Created PerformanceMetrics")

    print(f"✅ Successfully seeded data for {user.full_name}!")

if __name__ == '__main__':
    seed_data()
