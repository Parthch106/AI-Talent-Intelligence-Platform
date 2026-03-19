# AI Talent Intelligence Platform - V2 Implementation Documentation

## Overview

V2 (Transformer-Based) replaces the manual feature engineering of V1 with deep learning embeddings for fresher candidates (0-1 year experience).

---

## Architecture Comparison

### V1 (TF-IDF Based)

```
Resume → 24 Manual Features → TF-IDF → XGBoost → Score
```

### V2 (Transformer Based)

```
Resume → Text Sections → SentenceTransformer → Embeddings → Cosine Similarity → XGBoost → Score
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    V2 TALENT INTELLIGENCE SYSTEM                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   PHASE 1    │ →  │   PHASE 2    │ →  │   PHASE 3    │     │
│  │ Resume       │    │ Embedding    │    │ ML Model     │     │
│  │ Parsing      │    │ Generation   │    │ Inference    │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         ↓                   ↓                   ↓               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              PHASE 4-6: Final Output                 │     │
│  │  • Suitability Scoring  • Bias Mitigation            │     │
│  │  • Decision Logic      • Explainability              │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Frontend Trigger

```
User clicks "Compute Intelligence" with job role "ML_ENGINEER"
    ↓
POST /api/analytics/intelligence/compute/{intern_id}/
    Body: { "job_role": "ML_ENGINEER" }
```

### 2. Backend Entry Point

```
views_talent_intelligence.py
    ↓
LegacyComputeIntelligenceView.post()
    ↓
talent_intelligence_service.analyze_resume(user, job_role, create_application=True)
```

### 3. Main Pipeline (talent_intelligence_service.py)

#### Step A: Get Document & Create Application

```python
Document = Document.objects.filter(uploaded_by=user, document_type='RESUME').first()
Application.objects.get_or_create(intern=user, job_role=job_role_obj)
```

**Table:** `analytics_application`

#### Step B: Resume Parsing (Phase 1)

```python
raw_features = parse_document(document, job_role)
```

Returns:

- `skills`: List of skills found
- `education`: Education details
- `experience`: Work experience
- `projects`: Project descriptions
- `tools`: Tools used
- `certifications`: Certifications
- `_parsed_data`: Raw parsed dictionary
- `_raw_text`: Full text

#### Step C: Feature Engineering (Phase 2)

```python
engineered_features = advanced_feature_engine.build_ml_feature_vector(
    raw_features=raw_features,
    resume_skills=all_skills,
    required_skills=required_skills,
    projects=projects,
    raw_text=raw_text
)
```

**Table:** `analytics_structuredfeature`

#### Step D: Extract Resume Sections (V2 NEW)

```python
resume_sections = _extract_resume_sections(raw_features, document)
```

Converts to:

```python
{
    "professional_summary": "",
    "technical_skills": "Python, Machine Learning, TensorFlow,...",
    "frameworks_libraries": "",
    "tools_technologies": "Docker, Kubernetes, AWS,...",
    "experience_descriptions": "Software Engineer at Company X...",
    "project_descriptions": "Built a ML model for...",
    "education_text": "BS Computer Science, Stanford University...",
    "certifications": "AWS Certified Developer...",
}
```

#### Step E: Generate Embeddings (V2 CORE)

```python
embedding_results = embedding_engine.process_resume(
    resume_sections=resume_sections,
    role_description=role_description,
    apply_bias_mitigation=True
)
```

**Model:** SentenceTransformer (`all-MiniLM-L6-v2`)

- Embedding dimension: 384
- Output:
  - `resume_vector`: Combined resume embedding
  - `role_embedding`: Job role embedding
  - `semantic_match_score`: Cosine similarity (0-1)
  - `section_embeddings`: Individual section embeddings

**Embedding Combination Formula:**

```
Resume_Vector =
    0.30 × Experience_Embedding +
    0.30 × Projects_Embedding +
    0.20 × Skills_Embedding +
    0.10 × Summary_Embedding +
    0.10 × Education_Embedding
```

**Semantic Match Score:**

```
semantic_match_score = cosine_similarity(Resume_Vector, Role_Vector)
```

**Tables:**

- `analytics_resumesection` (parsed text)
- `analytics_resumeembedding` (embedding vectors)

#### Step F: ML Inference (Phase 3-4)

```python
predictions = ml_model_registry.predict(
    engineered_features,
    embedding_results=embedding_results
)
```

**Models Used:**

1. **Suitability Classifier (XGBoost)**
   - Input: Features + Embeddings + semantic_match_score
   - Output: Probability (0-1)
2. **Growth Potential Regressor**
   - Input: Experience + Project embeddings
   - Output: Score (0-1)
3. **Authenticity Classifier**
   - Input: Skill vs Experience embedding similarity
   - Output: Authenticity probability

**Table:** `analytics_modelprediction`

#### Step G: Bias Mitigation & Explainability

```python
bias_report = _apply_bias_mitigation(engineered_features, predictions)
analysis_result = _generate_explainable_output(...)
```

Returns:

- `top_strengths`: List of candidate strengths
- `risk_flags`: Potential concerns
- `recommendations`: Improvement suggestions
- `skill_gaps`: Missing skills

---

## Database Schema (V2 Tables)

### 1. analytics_application

| Field              | Type         | Description      |
| ------------------ | ------------ | ---------------- |
| id                 | UUID         | Primary key      |
| intern             | FK (User)    | Intern candidate |
| job_role           | FK (JobRole) | Target role      |
| resume_raw_text    | Text         | Raw resume text  |
| application_status | String       | Status           |
| created_at         | DateTime     | Creation time    |

### 2. analytics_resumesection (V2 NEW)

| Field                   | Type | Description         |
| ----------------------- | ---- | ------------------- |
| application             | FK   | Link to application |
| professional_summary    | Text | Summary section     |
| technical_skills        | Text | Skills text         |
| frameworks_libraries    | Text | Frameworks          |
| tools_technologies      | Text | Tools               |
| experience_descriptions | Text | Experience text     |
| project_descriptions    | Text | Projects text       |
| education_text          | Text | Education text      |
| certifications          | Text | Certifications      |

### 3. analytics_resumeembedding (V2 NEW)

| Field                | Type      | Description         |
| -------------------- | --------- | ------------------- |
| application          | FK        | Link to application |
| embedding            | JSONArray | 384-dim vector      |
| role_embedding       | JSONArray | Role vector         |
| semantic_match_score | Float     | Similarity score    |
| model_version        | String    | Model version       |

### 4. analytics_structuredfeature

| Field                    | Type    | Description          |
| ------------------------ | ------- | -------------------- |
| application              | FK      | Link to application  |
| skill_match_ratio        | Float   | Skills match %       |
| mandatory_skill_coverage | Boolean | All mandatory skills |
| domain_similarity_score  | Float   | Domain match         |
| gpa_normalized           | Float   | Normalized GPA       |
| project_count            | Integer | Number of projects   |
| ...                      | ...     | ...                  |

### 5. analytics_modelprediction

| Field                | Type   | Description                                                   |
| -------------------- | ------ | ------------------------------------------------------------- |
| application          | FK     | Link to application                                           |
| suitability_score    | Float  | Final score (0-1)                                             |
| technical_score      | Float  | Technical score                                               |
| growth_score         | Float  | Growth potential                                              |
| authenticity_score   | Float  | Authenticity                                                  |
| semantic_match_score | Float  | Semantic match                                                |
| decision             | String | INTERVIEW_SHORTLIST/TECHNICAL_ASSIGNMENT/MANUAL_REVIEW/REJECT |
| model_version        | String | "transformer_xgb_v2"                                          |
| confidence_score     | Float  | Model confidence                                              |

---

## Decision Thresholds (V2)

| Score       | Decision             | Action               |
| ----------- | -------------------- | -------------------- |
| ≥ 0.80      | INTERVIEW_SHORTLIST  | Proceed to interview |
| 0.65 - 0.79 | TECHNICAL_ASSIGNMENT | Send coding test     |
| 0.50 - 0.64 | MANUAL_REVIEW        | HR review            |
| < 0.50      | REJECT               | Reject               |

---

## API Endpoints

### POST /api/analytics/intelligence/compute/{intern_id}/

**Request:**

```json
{
  "job_role": "ML_ENGINEER"
}
```

**Response:**

```json
{
  "message": "Intelligence computed successfully!",
  "model_version": "transformer_xgb_v2",
  "suitability_score": 0.42,
  "decision": "REJECT",
  "semantic_match_score": 0.0,
  "growth_score": 0.64,
  "authenticity_score": 0.62,
  "confidence_score": 0.74,
  "scores": {
    "suitability": 0.42,
    "semantic_match": 0.0,
    "growth": 0.64,
    "authenticity": 0.62,
    "technical": 0.0
  },
  "top_strengths": [...],
  "risk_flags": [...],
  "skill_gaps": [...],
  "recommendations": [...]
}
```

### GET /api/analytics/intelligence/?intern_id=123&job_role=ML_ENGINEER

**Response:** Same as above (retrieved from database)

---

## Bias Mitigation (V2)

Applied at embedding stage:

1. **Remove name** before embedding generation
2. **Remove university name** before scoring
3. **Normalize experience length**
4. **Separate education** influence from technical signal

This prevents:

- Prestige bias
- Gender bias
- Institution bias

---

## Key Differences: V1 vs V2

| Feature        | V1                | V2                     |
| -------------- | ----------------- | ---------------------- |
| Embedding      | TF-IDF            | SentenceTransformer    |
| Features       | 24 manual         | 384-dim vectors        |
| Semantic Match | Keyword-based     | Cosine similarity      |
| Decision       | Manual thresholds | Data-driven            |
| Model          | XGBoost           | XGBoost + Transformers |

---

## Files Modified for V2

1. **embedding_engine.py** - NEW
   - SentenceTransformer integration
   - Section-wise embedding generation
   - Semantic similarity calculation

2. **talent_intelligence_service.py** - UPDATED
   - Added `_extract_resume_sections()`
   - Added `_store_resume_sections()`
   - Added `_store_embeddings()`
   - Updated to use embedding results

3. **views_talent_intelligence.py** - UPDATED
   - Fixed job_role filtering
   - Added scores object for frontend

4. **AnalysisPage.tsx** - UPDATED
   - Added job_role to API calls
   - Fixed risk_flags handling

---

## Version History

| Version | Date       | Changes                        |
| ------- | ---------- | ------------------------------ |
| v1.0    | 2026-02-13 | Initial implementation         |
| v2.0    | 2026-02-17 | Transformer-based architecture |

---

Author: AI Talent Intelligence Platform
