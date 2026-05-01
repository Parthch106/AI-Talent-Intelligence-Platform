
import os
import sys
import django
import random
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.analytics.models import ConversionScore

def simulate_scores():
    interns = User.objects.filter(role='INTERN')
    print(f"Found {interns.count()} interns. Generating scores...")

    for intern in interns:
        # Higher score for those with more reports or better performance
        # but here we just randomize for the simulation
        composite_score = random.uniform(65, 98)
        
        score, created = ConversionScore.objects.update_or_create(
            intern=intern,
            defaults={
                'performance_trend_score': random.uniform(70, 95),
                'absolute_performance_score': random.uniform(70, 95),
                'skill_growth_delta': random.uniform(5, 25),
                'manager_sentiment_trend': random.uniform(0.6, 0.95),
                'peer_comparison_percentile': random.uniform(60, 99),
                'composite_score': composite_score,
                'model_version': 'v1.0-sim',
                'feature_vector': {'simulated': True}
            }
        )
        status = "Created" if created else "Updated"
        print(f"  {status} score for {intern.email}: {composite_score:.1f}%")

if __name__ == "__main__":
    simulate_scores()
