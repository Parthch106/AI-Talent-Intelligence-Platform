#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'django_pg_backend', 'core'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.models import ModelPrediction

print("=" * 50)
print("MODEL PREDICTIONS - DETAILED")
print("=" * 50)
preds = ModelPrediction.objects.all().order_by('-id')[:10]
print(f"Total: {preds.count()}")
for p in preds:
    print(f"ID: {p.id}, App: {p.application_id}")
    print(f"  Suitability: {p.suitability_score}")
    print(f"  Semantic Match: {p.semantic_match_score}")
    print(f"  Growth: {p.growth_score}")
    print(f"  Authenticity: {p.authenticity_score}")
    print(f"  Decision: {p.decision}")
    print(f"  Model Version: {p.model_version}")
    print()
