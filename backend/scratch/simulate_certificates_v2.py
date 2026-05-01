
import os
import django
import uuid
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Set Celery to eager mode
from django.conf import settings
settings.CELERY_TASK_ALWAYS_EAGER = True
settings.CELERY_TASK_EAGER_PROPAGATES = True

from apps.accounts.models import User, InternProfile as InternProfileV2
from apps.analytics.models import (
    CertificationCriteria, 
    PerformanceMetrics, 
    PhaseEvaluation, 
    CertificationRecord,
    EmploymentStage,
    WeeklyReportV2
)
from apps.analytics.tasks import run_criteria_evaluation

# Setup
admin = User.objects.filter(role='ADMIN').first()
if not admin:
    print("No Admin found. Creating one...")
    admin = User.objects.create_superuser('admin_sim@example.com', 'password123', full_name='Admin Simulator')

def get_or_create_criteria(phase):
    criteria = CertificationCriteria.objects.filter(phase=phase, is_active=True).first()
    if not criteria:
        print(f"  Creating new criteria for {phase}...")
        criteria = CertificationCriteria.objects.create(
            phase=phase,
            is_active=True,
            min_overall_score=70,
            min_productivity_score=60,
            min_quality_score=60,
            min_engagement_score=60,
            min_attendance_pct=80,
            min_weekly_reports_submitted=4,
            created_by=admin,
            description=f'Default {phase} Criteria'
        )
    else:
        print(f"  Using existing criteria for {phase}")
    return criteria

# 1. Ensure Criteria exist
print("Checking Certification Criteria...")
phases = ['PHASE_1', 'PHASE_2', 'PPO']
for p in phases:
    get_or_create_criteria(p)

# 2. Simulation data
sim_data = [
    {
        'email': 'alex.johnson@intern.com',
        'phase': 'PHASE_1',
        'target_status': 'ACTIVE_INTERN',
        'score': 85.5
    },
    {
        'email': 'test_intern_2026@example.com',
        'phase': 'PHASE_2',
        'target_status': 'STIPEND_INTERN',
        'score': 88.2
    },
    {
        'email': 'student1@front.com',
        'phase': 'PPO', 
        'target_status': 'STIPEND_INTERN',
        'score': 92.7
    }
]

print("\nStarting intern simulation...")
for data in sim_data:
    try:
        print(f"Simulating for {data['email']} - {data['phase']}...")
        user = User.objects.get(email=data['email'])
        
        # Get or create InternProfileV2
        profile, _ = InternProfileV2.objects.get_or_create(user=user)
        
        # Update status if needed
        if profile.status != data['target_status']:
            print(f"  Updating status from {profile.status} to {data['target_status']}")
            profile.status = data['target_status']
            profile.save()
        
        # Phase mapping for EmploymentStage
        stage_phase = 'FULL_TIME' if data['phase'] == 'PPO' else data['phase']
        
        # Ensure EmploymentStage
        stage, _ = EmploymentStage.objects.get_or_create(
            intern=user,
            phase=stage_phase,
            phase_end_date__isnull=True,
            defaults={
                'phase_start_date': date.today() - timedelta(days=180)
            }
        )
        
        # Performance Metrics
        PerformanceMetrics.objects.filter(intern=user).delete()
        metrics = PerformanceMetrics.objects.create(
            intern=user,
            period_start=stage.phase_start_date,
            period_end=date.today(),
            period_type='MONTHLY',
            overall_performance_score=data['score'],
            productivity_score=data['score'] + 2,
            quality_score=data['score'] - 2,
            engagement_score=data['score'],
            attendance_rate=95.0,
            tasks_completed=10,
            tasks_assigned=10
        )
        
        # Create Dummy Reports
        WeeklyReportV2.objects.filter(intern=user).delete()
        for i in range(5):
            WeeklyReportV2.objects.get_or_create(
                intern=user,
                week_start=date.today() - timedelta(weeks=i+1),
                defaults={
                    'week_end': date.today() - timedelta(weeks=i) - timedelta(days=1),
                    'week_number': i + 1,
                    'attendance_pct': 95.0,
                    'productivity_score': data['score'],
                    'quality_score': data['score'],
                    'engagement_score': data['score'],
                    'overall_weekly_score': data['score'],
                    'is_auto_generated': True
                }
            )
        
        # Phase Evaluation
        evaluation = PhaseEvaluation.objects.filter(intern=user, employment_stage=stage).first()
        if evaluation and hasattr(evaluation, 'certificate'):
            print(f"  Certificate already exists for {user.email} - {data['phase']}")
            continue
            
        if evaluation:
            evaluation.delete()
        
        evaluation = PhaseEvaluation.objects.create(
            intern=user,
            employment_stage=stage,
            evaluated_by=admin,
            overall_score=data['score'],
            decision='PROMOTE',
            manager_notes=f"Automated simulation for {data['phase']}"
        )
        
        # Trigger evaluation logic
        print(f"  Running criteria evaluation for evaluation {evaluation.id}...")
        success = run_criteria_evaluation(evaluation.id)
        
        if success:
            print(f"  SUCCESS: Certificate generated for {user.email}")
            cert = CertificationRecord.objects.filter(phase_evaluation=evaluation).first()
            if cert:
                print(f"  Certificate ID: {cert.unique_cert_id}")
        else:
            print(f"  FAILED: Criteria not met for {user.email}.")
            from apps.analytics.services.certification_service import get_aggregated_scores, evaluate_criteria
            lookup_phase = 'PPO' if data['phase'] == 'PPO' else data['phase']
            criteria = CertificationCriteria.objects.filter(phase=lookup_phase, is_active=True).first()
            scores = get_aggregated_scores(user, stage.phase_start_date, date.today())
            print(f"    Scores: {scores}")
            result = evaluate_criteria(scores, criteria)
            print(f"    Failed Checks: {result['failed_checks']}")
            
    except User.DoesNotExist:
        print(f"  ERROR: User {data['email']} not found.")
    except Exception as e:
        print(f"  ERROR: {str(e)}")

print("\nSimulation complete.")
