# ML Talent Intelligence - Trained Models Report

## Overview

This document describes the trained XGBoost models for the AI Talent Intelligence Platform. The models were trained on a dataset of 10,000 synthetic resume samples.

---

## Training Data Summary

| Metric | Value |
|--------|-------|
| Total Samples | 10,000 |
| Features | 24 |
| Job Roles | 5 |
| Training Date | 2026-02-13 |

### Job Role Distribution

| Role | Count |
|------|-------|
| AI_RESEARCH_INTERN | 2,070 |
| FULL_STACK_DEVELOPER | 2,001 |
| BACKEND_DEVELOPER | 1,985 |
| ML_ENGINEER | 1,976 |
| DATA_ANALYST | 1,968 |

---

## Model Performance

### 1. Suitability Classification Model

| Metric | Score |
|--------|-------|
| **Type** | XGBoost Classifier |
| **Accuracy** | 89.00% |
| **ROC-AUC** | 0.9547 |

**Top 5 Most Important Features:**

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | `mandatory_skill_coverage` | 0.3321 |
| 2 | `critical_skill_gap_count` | 0.2009 |
| 3 | `skill_match_ratio` | 0.1696 |
| 4 | `domain_similarity_score` | 0.0612 |
| 5 | `project_complexity_score` | 0.0343 |

**Purpose:** Predict if candidate should be shortlisted for interview (≥0.75 threshold)

---

### 2. Growth Potential Regression Model

| Metric | Score |
|--------|-------|
| **Type** | XGBoost Regressor |
| **R² Score** | 0.6804 |

**Purpose:** Predict candidate's growth potential score (0-1)

---

### 3. Authenticity Classification Model

| Metric | Score |
|--------|-------|
| **Type** | XGBoost Classifier |
| **Accuracy** | 89.85% |
| **ROC-AUC** | 0.5097 |

**Purpose:** Detect resume inflation/fabrication

---

### 4. Communication Score Regression Model

| Metric | Score |
|--------|-------|
| **Type** | XGBoost Regressor |
| **R² Score** | 0.9601 |

**Purpose:** Predict communication skills score (0-1)

---

### 5. Leadership Classification Model

| Metric | Score |
|--------|-------|
| **Type** | XGBoost Classifier |
| **Accuracy** | 100.00% |
| **ROC-AUC** | 1.0000 |

**Purpose:** Predict leadership potential

---

## Feature Engineering

The models use 24 engineered features from resume data:

### Skill Features
- `skill_match_ratio`
- `domain_similarity_score`
- `skill_depth_score`
- `skill_project_consistency`

### Education Features
- `degree_level_encoded`
- `gpa_normalized`
- `university_tier_score`
- `coursework_relevance_score`

### Experience Features
- `experience_duration_months`
- `internship_relevance_score`
- `open_source_score`
- `hackathon_count`

### Project Features
- `project_count`
- `project_complexity_score`
- `quantified_impact_presence`
- `production_tools_usage_score`
- `github_activity_score`

### Resume Quality Features
- `keyword_stuffing_ratio`
- `resume_consistency_score`
- `writing_clarity_score`
- `action_verb_density`
- `resume_length_normalized`

### Critical Features
- `mandatory_skill_coverage`
- `critical_skill_gap_count`

---

## Decision Logic

### Suitability Thresholds

| Score Range | Decision | Action |
|-------------|----------|--------|
| ≥ 0.75 | INTERVIEW_SHORTLIST | Proceed to interview |
| 0.60 - 0.74 | TECHNICAL_ASSIGNMENT | Send coding test |
| 0.50 - 0.59 | MANUAL_REVIEW | HR review |
| < 0.50 | REJECT | Not suitable |

---

## Model Files

Trained models are saved in:
```
django_pg_backend/core/apps/analytics/management/trained_models/
```

| File | Description |
|------|-------------|
| `suitability_model.pkl` | Suitability classifier |
| `growth_model.pkl` | Growth potential regressor |
| `authenticity_model.pkl` | Authenticity classifier |
| `communication_model.pkl` | Communication score regressor |
| `leadership_model.pkl` | Leadership classifier |
| `metadata.json` | Training metadata |
| `training_report.md` | This report |

---

## Usage Example

```python
import pickle
import numpy as np

# Load model
with open('trained_models/suitability_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Prepare features (24 features)
features = np.array([[0.8, 0.7, 0.6, 0.5, 0.4, 1, 0.8, 0.6, 0.7, 
                      3, 0.5, 0.2, 1, 3, 1, 0.6, 0.4, 0.3, 
                      0.7, 0.6, 0.5, 0.5, True, 0]])

# Predict
prediction = model.predict(features)
probability = model.predict_proba(features)[:, 1]

print(f"Suitability: {probability[0]:.2f}")
```

---

## Retraining

To retrain models with new data:

```bash
cd django_pg_backend/core
python manage.py train_models
```

---

## Next Steps

1. **Integrate models into inference pipeline** - Update `ml_models.py` to use trained models
2. **Add SHAP explainability** - Explain individual predictions
3. **Monitor drift** - Track model performance over time
4. **Collect real-world feedback** - Use hiring outcomes to improve

---

*Generated: 2026-02-13*
*Training Command: `python manage.py train_models`*
