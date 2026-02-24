#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'django_pg_backend', 'core'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.documents.models import Document, ResumeData
from apps.analytics.models import Application, ResumeSection, ResumeEmbedding, ModelPrediction, StructuredFeature

print("=" * 50)
print("DOCUMENTS TABLE")
print("=" * 50)
docs = Document.objects.all()
print(f"Total Documents: {docs.count()}")
for d in docs[:3]:
    raw_len = len(d.raw_text) if d.raw_text else 0
    print(f"  ID: {d.id}, Title: {d.title}, raw_text length: {raw_len}")

print("\n" + "=" * 50)
print("RESUMEDATA TABLE")
print("=" * 50)
rd = ResumeData.objects.all()
print(f"Total ResumeData: {rd.count()}")
for r in rd[:3]:
    skills = r.skills if r.skills else []
    print(f"  ID: {r.id}, Skills count: {len(skills)}, Skills: {skills[:5] if skills else []}")

print("\n" + "=" * 50)
print("APPLICATIONS TABLE")
print("=" * 50)
apps = Application.objects.all()
print(f"Total Applications: {apps.count()}")
for a in apps[:3]:
    print(f"  ID: {a.id}, Intern: {a.intern_id}, Job Role: {a.job_role}")

print("\n" + "=" * 50)
print("RESUME SECTIONS TABLE")
print("=" * 50)
rs = ResumeSection.objects.all()
print(f"Total ResumeSections: {rs.count()}")
for r in rs[:3]:
    skills = r.technical_skills[:50] if r.technical_skills else ''
    print(f"  ID: {r.id}, App: {r.application_id}, Skills: {skills}...")

print("\n" + "=" * 50)
print("RESUME EMBEDDINGS TABLE")
print("=" * 50)
re = ResumeEmbedding.objects.all()
print(f"Total ResumeEmbeddings: {re.count()}")
for r in re[:3]:
    emb_len = len(r.combined_embedding) if r.combined_embedding else 0
    print(f"  ID: {r.id}, App: {r.application_id}, Embedding length: {emb_len}")

print("\n" + "=" * 50)
print("STRUCTURED FEATURES TABLE")
print("=" * 50)
sf = StructuredFeature.objects.all()
print(f"Total StructuredFeatures: {sf.count()}")
for s in sf[:3]:
    print(f"  ID: {s.id}, App: {s.application_id}")

print("\n" + "=" * 50)
print("MODEL PREDICTIONS TABLE")
print("=" * 50)
mp = ModelPrediction.objects.all()
print(f"Total ModelPredictions: {mp.count()}")
for m in mp[:3]:
    print(f"  ID: {m.id}, App: {m.application_id}, Suitability: {m.suitability_score}")
