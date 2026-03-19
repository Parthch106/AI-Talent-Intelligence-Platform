#!/usr/bin/env python
"""
Test script to verify trained models are loading correctly and test inference.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.analytics.services.embedding_engine import EmbeddingEngine
from apps.analytics.services.ml_models import ml_model_registry

# Test resumes
RESUMES = {
    "Senior Software Engineer": """
John Smith
Senior Software Engineer

EXPERIENCE:
- 5+ years of software development experience
- Expert in Python, JavaScript, React, Node.js
- Led team of 5 engineers at Tech Corp
- Implemented microservices architecture
- Reduced system latency by 40%

SKILLS:
Python, JavaScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL, MongoDB, REST APIs, GraphQL

EDUCATION:
Bachelor of Science in Computer Science
University of Technology, 2018

CERTIFICATIONS:
- AWS Solutions Architect Professional
- Certified Kubernetes Administrator
""",
    "Junior Engineer": """
Jane Doe
Junior Software Engineer

EXPERIENCE:
- 1 year of software development experience
- Worked on frontend development using React
- Assisted with backend API development
- Participated in code reviews

SKILLS:
Python, JavaScript, React, HTML, CSS, Git

EDUCATION:
Bachelor of Science in Computer Science
State University, 2023
""",
    "Fresher": """
Bob Johnson
Software Engineer (Fresher)

EXPERIENCE:
- Completed internship at Startup Inc
- Worked on academic projects
- Participated in hackathons

SKILLS:
Python, Java, C++, HTML, CSS, SQL

EDUCATION:
Bachelor of Technology in Computer Science
Institute of Technology, 2024
"""
}

print("=" * 60)
print("TESTING TRAINED MODELS WITH DIFFERENT RESUME TYPES")
print("=" * 60)

# 1. Verify all models are trained
print("\n1. Model Status:")
for name in ['suitability', 'growth_potential', 'authenticity']:
    model = ml_model_registry.get_model(name)
    if hasattr(model, '_trained_model') and model._trained_model is not None:
        print(f"   {name}: TRAINED [OK]")
    else:
        print(f"   {name}: FALLBACK [X]")

# 2. Test each resume type
embedding_engine = EmbeddingEngine()

print("\n2. Testing Resume Types:")
for resume_type, resume_text in RESUMES.items():
    print(f"\n--- {resume_type} ---")
    embeddings = embedding_engine.model.encode(resume_text)
    results = ml_model_registry.predict_all({}, embeddings)
    print(f"   suitability_score: {results['suitability_score']:.3f}")
    print(f"   growth_potential_score: {results['growth_potential_score']:.3f}")
    print(f"   resume_authenticity_score: {results['resume_authenticity_score']:.3f}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
