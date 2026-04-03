#!/usr/bin/env python
"""
Test script to evaluate different resumes against different department roles
to observe varying outcomes from the suitability model.
"""
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.analytics.services.embedding_engine import EmbeddingEngine
from apps.analytics.services.ml_models import ml_model_registry
from apps.analytics.services.suitability_scorer import suitability_scorer, get_decision_explanation
from sklearn.metrics.pairwise import cosine_similarity

# Department Resumes
RESUMES = {
    "ENG_Senior_Dev": {
        "text": """
Name: Alice Hacker
Role: Senior Full Stack Developer

EXPERIENCE:
- 8 years of software development experience
- Expert in Python, Django, React, TypeScript
- Architected highly scalable cloud applications on AWS
- Led a team of 10 developers

SKILLS:
Python, Django, React, TypeScript, AWS, Docker, CI/CD, System Architecture
""",
        "department": "Engineering"
    },
    "ENG_Entry_Data": {
        "text": """
Name: Bob Data
Role: Junior Data Analyst

EXPERIENCE:
- 6 months internship as Data Analyst
- Built dashboards using Tableau and PowerBI
- Cleaned and processed large datasets using Pandas

SKILLS:
Python, SQL, Pandas, Tableau, PowerBI, Statistics
""",
        "department": "Engineering"
    },
    "MKT_Specialist": {
        "text": """
Name: Carol Market
Role: Digital Marketing Specialist

EXPERIENCE:
- 4 years in digital marketing, SEO, and content strategy
- Managed social media ad campaigns with $100k monthly budget
- Increased website organic traffic by 150%

SKILLS:
SEO, Google Analytics, social media marketing, content creation, copywriting
""",
        "department": "Marketing"
    },
    "HR_Recruiter": {
        "text": """
Name: Dave Talent
Role: Technical Recruiter

EXPERIENCE:
- 3 years recruiting for software engineering roles
- Handled end-to-end recruitment lifecycle
- Sourced candidates using LinkedIn Recruiter and structured Boolean searches

SKILLS:
Sourcing, ATS (Lever, Greenhouse), Interviewing, Negotiation
""",
        "department": "Human Resources"
    }
}

# Department Jobs
ROLES = {
    "ENG_Lead_Backend": {
        "text": """
Lead Backend Engineer
Requirements: 5+ years of experience with Python/Django. Deep understanding of AWS, scalable systems, and microservices. Leadership skills required.
""",
        "department": "Engineering"
    },
    "ENG_Senior_Data_Scientist": {
        "text": """
Senior Data Scientist
Requirements: 5+ years experience. Expert in Machine Learning, Deep Learning, NLP, and deploying models to production using PyTorch/TensorFlow.
""",
        "department": "Engineering"
    },
    "MKT_Manager": {
        "text": """
Marketing Manager
Requirements: 5+ years in digital marketing. Proven track record of managing large ad budgets, leading SEO initiatives, and driving growth.
""",
        "department": "Marketing"
    },
    "MKT_Designer": {
        "text": """
Senior Graphic Designer
Requirements: Expert in Adobe Creative Suite, UI/UX principles, and visual branding. Portfolio required.
""",
        "department": "Marketing"
    },
    "HR_Tech_Recruiter": {
        "text": """
Technical Recruiter
Requirements: 2+ years of experience recruiting tech talent. Familiarity with ATS, great communication skills, and ability to source passive candidates.
""",
        "department": "Human Resources"
    }
}

print("=" * 80)
print("TESTING SUITABILITY MODEL ACROSS DIFFERENT DEPARTMENTS")
print("=" * 80)

# Initialize embedding engine
embedding_engine = EmbeddingEngine()

results = []

for resume_key, resume_data in RESUMES.items():
    resume_text = resume_data["text"]
    resume_embedding = embedding_engine.model.encode(resume_text)
    
    print(f"\n[{resume_data['department']}] Candidate: {resume_key}")
    
    # Get ML predictions based solely on the resume
    ml_predictions = ml_model_registry.predict_all({}, resume_embedding)
    
    for role_key, role_data in ROLES.items():
        role_text = role_data["text"]
        
        # We want to show a variety of outcomes:
        # Same department vs Cross department matches
        # Exact match vs Overqualified vs Underqualified vs Completely Irrelevant
        
        role_embedding = embedding_engine.model.encode(role_text)
        
        # Compute semantic match
        semantic_match = cosine_similarity(
            resume_embedding.reshape(1, -1), 
            role_embedding.reshape(1, -1)
        )[0][0]
        
        base_suitability = ml_predictions.get('suitability_score', 0.5)
        
        # Prepare embedding results map that the scorer uses
        embedding_results = {'semantic_match_score': semantic_match}
        
        # Compute final suitability via actual scorer logic
        final_result = suitability_scorer.compute_final_suitability(
            ml_predictions=ml_predictions,
            embedding_results=embedding_results
        )
        
        score = final_result['suitability_score']
        decision = final_result['decision']
        
        # Append for summary
        results.append({
            "Resume": resume_key,
            "Role": role_key,
            "Res_Dept": resume_data['department'],
            "Role_Dept": role_data['department'],
            "Semantic_Match": semantic_match,
            "Base_ML": base_suitability,
            "Final_Score": score,
            "Decision": decision
        })

print("\n\n" + "=" * 80)
print("SUMMARY OF OUTCOMES")
print("=" * 80)

# Print a formatted table
print(f"{'Candidate (Dept)':<25} | {'Role (Dept)':<25} | {'Semantic':<8} | {'Score':<5} | {'Decision'}")
print("-" * 100)
for r in results:
    cand_str = f"{r['Resume']} ({r['Res_Dept'][:3]})"
    role_str = f"{r['Role']} ({r['Role_Dept'][:3]})"
    print(f"{cand_str:<25} | {role_str:<25} | {r['Semantic_Match']:.2f}     | {r['Final_Score']:.2f}  | {r['Decision']}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
