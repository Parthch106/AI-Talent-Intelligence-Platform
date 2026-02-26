# Daily Intern Report

**Date:** 25/02/2026  
**Intern Name:** Parth Chauhan

**Project Title:** AI Talent Intelligence Platform

---

## Tasks Completed Today:

### 1. Training Data Verification

- Verified the synthetic resume dataset (`synthetic_resume_dataset_20000_advanced.csv`) for ML model training
- Dataset contains:
  - 20,000 synthetic resume records
  - 11 columns: candidate_id, applied_role, professional_summary, technical_skills, frameworks_libraries, tools_technologies, experience_descriptions, project_descriptions, education_text, certifications, suitability_label
  - 4 roles: ML Engineer, Data Analyst, Frontend Developer, Backend Developer
  - Label distribution: 74.9% positive (14,973), 25.1% negative (5,027)
- Confirmed all columns match the training code requirements in `train_models_v2.py`

### 2. LLM Resume Parser Implementation

- The system uses **LangChainResumeParser** (GPT-4o-mini via GitHub OpenAI API)
- Parser location: `django_pg_backend/core/apps/analytics/services/llm_resume_parser.py`
- Features:
  - PDF text extraction using PyMuPDF4LLM
  - LLM-based structured parsing with zero-shot prompting
  - Outputs structured JSON with: professional_summary, technical_skills, frameworks, tools, experience, projects, education, certifications
  - Anti-hallucination rules enabled

### 3. Embedding Engine Upgrade

- Upgraded from MiniLM (384 dim) to **BAAI/bge-large-en-v1.5** (1024 dimensions)
- Location: `django_pg_backend/core/apps/analytics/services/embedding_engine.py`
- Weighted section embedding:
  - Professional Summary: 25%
  - Experience: 40%
  - Skills/Projects: 25%
  - Education: 10%

### 4. ML Model Training Pipeline

- Training command: `python manage.py train_models_v2`
- Dataset path: `django_pg_backend/core/docs/synthetic_resume_dataset_20000_advanced.csv`
- Output: Trained models in `apps/analytics/management/trained_models/`

### 5. Scoring & Decision System

- **SuitabilityScorer** combines:
  - ML model score (40% weight)
  - Semantic match score (60% weight)
- Decision thresholds:
  - INTERVIEW_SHORTLIST: 0.75
  - TECHNICAL_ASSIGNMENT: 0.55
  - MANUAL_REVIEW: 0.40

---

## Problems Faced:

1. **Parsing Issues**: Previous regex-based parser caused section leakage (email/phone in projects), concatenated garbage text, and duplicate skills
2. **Low Semantic Scores**: Original cosine similarity ~0.24 even for relevant ML resumes due to weak embeddings (MiniLM)
3. **ML Model Bias**: Previous weighting (70% ML + 30% semantic) produced too many REJECT decisions
4. **Class Imbalance**: Training data has 75% positive labels, which may affect model bias

---

## Solutions Found:

1. **LLM-Based Parser**: Replaced simple regex parser with GPT-4o-mini for structured extraction
2. **Better Embeddings**: Upgraded to bge-large-en-v1.5 for improved semantic matching
3. **Adjusted Weights**: Changed scoring formula to 40% ML + 60% semantic for better decisions
4. **Lowered Thresholds**: Adjusted decision thresholds to reduce false rejections

---

## Plans for Tomorrow:

1. Run the full ML model training with the verified dataset
2. Test the analysis pipeline with real intern resumes
3. Verify the new parser produces clean, structured output
4. Check semantic match scores are now in the meaningful range (0.65+ for relevant candidates)
5. Review ML model predictions (Growth, Communication, Authenticity scores)

---

## Key Files Modified:

| File                                          | Purpose                                |
| --------------------------------------------- | -------------------------------------- |
| `llm_resume_parser.py`                        | LLM-based resume parsing               |
| `embedding_engine.py`                         | BGE embeddings with weighted sections  |
| `suitability_scorer.py`                       | Combined scoring with adjusted weights |
| `talent_intelligence_service.py`              | Main orchestration service             |
| `train_models_v2.py`                          | ML model training pipeline             |
| `synthetic_resume_dataset_20000_advanced.csv` | Training data (20,000 records)         |
