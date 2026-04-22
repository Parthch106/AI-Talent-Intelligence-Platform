#!/usr/bin/env python
"""
Test script to verify trained models work with job roles.
This tests the full pipeline including semantic matching.
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

# Job roles to test
JOB_ROLES = [
    "SENIOR_SOFTWARE_ENGINEER",
    "JUNIOR_SOFTWARE_ENGINEER",
    "SOFTWARE_ENGINEER"  # Entry-level/fresher
]

# Role descriptions
ROLE_DESCRIPTIONS = {
    "SENIOR_SOFTWARE_ENGINEER": """
Senior Software Engineer position requiring 3+ years of experience.
Must have expertise in Python, JavaScript, React, Node.js.
Experience with cloud platforms (AWS, Azure, GCP), microservices, team leadership.
""",
    "JUNIOR_SOFTWARE_ENGINEER": """
Junior Software Engineer position requiring 1-2 years of experience.
Should know Python, JavaScript, React. Good understanding of web development.
""",
    "SOFTWARE_ENGINEER": """
Software Engineer (Entry Level/Fresher) position.
Looking for candidates with computer science degree.
Knowledge of programming basics, willingness to learn.
"""
}

print("=" * 70)
print("TESTING TRAINED MODELS WITH JOB ROLES")
print("=" * 70)

# Initialize embedding engine
embedding_engine = EmbeddingEngine()

# Test each resume with each job role
for resume_type, resume_text in RESUMES.items():
    print(f"\n{'='*70}")
    print(f"RESUME: {resume_type}")
    print(f"{'='*70}")
    
    # Generate resume embedding
    resume_embedding = embedding_engine.model.encode(resume_text)
    
    for job_role in JOB_ROLES:
        role_desc = ROLE_DESCRIPTIONS[job_role]
        
        # Generate role embedding
        role_embedding = embedding_engine.model.encode(role_desc)
        
        # Compute semantic match
        from sklearn.metrics.pairwise import cosine_similarity
        semantic_match = cosine_similarity(
            resume_embedding.reshape(1, -1), 
            role_embedding.reshape(1, -1)
        )[0][0]
        
        # Get ML predictions (just using embeddings)
        ml_predictions = ml_model_registry.predict_all({}, resume_embedding)
        
        # Compute final suitability (same formula as suitability_scorer)
        base_suitability = ml_predictions.get('suitability_score', 0.5)
        final_score = 0.4 * base_suitability + 0.6 * semantic_match
        final_score = min(max(final_score, 0.0), 1.0)
        
        print(f"\n  Applied for: {job_role}")
        print(f"    ML Suitability Score: {ml_predictions['suitability_score']:.3f}")
        print(f"    Semantic Match: {semantic_match:.3f}")
        print(f"    FINAL SCORE: {final_score:.3f}")
        
print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)
