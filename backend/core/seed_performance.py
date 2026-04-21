from apps.accounts.models import User, InternProfile, StipendRecord
from apps.analytics.models import PerformanceMetrics
from datetime import date, timedelta
import random

# Get all interns
interns = User.objects.filter(role='INTERN')

print(f"Syncing {interns.count()} interns to V2 Performance Data...")

for intern in interns:
    # 1. Ensure PerformanceMetrics exist
    metrics, m_created = PerformanceMetrics.objects.get_or_create(
        intern=intern,
        period_start=date.today() - timedelta(days=30),
        period_end=date.today(),
        defaults={
            'overall_performance_score': random.uniform(65, 95),
            'productivity_score': random.uniform(60, 98),
            'quality_score': random.uniform(70, 95),
            'engagement_score': random.uniform(50, 90),
            'attendance_rate': random.uniform(80, 100),
        }
    )
    if m_created:
        print(f"   + Created metrics for {intern.email}: {metrics.overall_performance_score:.1f}%")
    else:
        # Update existing metrics to be "V2 compatible"
        metrics.overall_performance_score = random.uniform(65, 95)
        metrics.save()

print("V2 performance seeding complete.")
