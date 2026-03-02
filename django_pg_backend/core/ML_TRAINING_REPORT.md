# AI Talent Intelligence Platform - ML Training Report

**Report Date:** 2026-02-27  
**Platform:** AI Talent Intelligence Platform  
**Status:** ✅ Training Complete - Models Deployed

---

## 1. System Overview

### Components Built:

1. **LLM Resume Parser** - Uses GPT-4o-mini via GitHub Models API
2. **Embedding Engine** - Uses BAAI/bge-large-en-v1.5 (1024 dimensions)
3. **ML Models (XGBoost)**:
   - suitability_model_v2.pkl
   - growth_model_v2.pkl
   - authenticity_model_v2.pkl
4. **Training Pipeline** - `train_models_v2.py` with 2,000 sample configuration

---

## 2. Training Configuration

| Parameter            | Value                            |
| -------------------- | -------------------------------- |
| Dataset              | `it_resume_dataset_10000_v2.csv` |
| Training Samples     | 9,996                            |
| Embedding Model      | BAAI/bge-large-en-v1.5           |
| Embedding Dimensions | 1024                             |
| Model Version        | transformer_xgb_v2               |
| Training Date        | 2026-02-27                       |

---

## 3. Model Performance Metrics

### 3.1 Suitability Model (Classification)

| Metric        | Score  |
| ------------- | ------ |
| **Accuracy**  | 94.0%  |
| **Precision** | 100.0% |
| **Recall**    | 89.2%  |
| **F1-Score**  | 94.3%  |
| **ROC-AUC**   | 97.4%  |
| **CV Mean**   | 97.3%  |
| **CV Std**    | 0.28%  |

### 3.2 Growth Potential Model (Regression)

| Metric       | Score |
| ------------ | ----- |
| **R2 Score** | 79.1% |

### 3.3 Authenticity Model (Classification)

| Metric        | Score |
| ------------- | ----- |
| **Precision** | 99.5% |

---

## 4. Top Feature Importance (Suitability Model)

| Rank | Feature                  | Importance |
| ---- | ------------------------ | ---------- |
| 1    | mandatory_skill_coverage | 33.21%     |
| 2    | critical_skill_gap_count | 20.09%     |
| 3    | skill_match_ratio        | 16.96%     |
| 4    | domain_similarity_score  | 6.12%      |
| 5    | project_complexity_score | 3.43%      |

---

## 5. Inference Test Results

### 5.1 Without Job Role (Content-Based Only)

| Resume Type              | suitability_score | growth_potential | authenticity |
| ------------------------ | ----------------- | ---------------- | ------------ |
| Senior Software Engineer | 0.969             | 0.441            | 0.883        |
| Junior Engineer          | 0.348             | 0.982            | 0.349        |
| Fresher                  | 0.248             | 0.775            | 0.118        |

### 5.2 With Job Role (Content + Semantic Matching)

The system combines:

- **ML Suitability Score (40%)**: Based on resume content quality
- **Semantic Match Score (60%)**: Based on resume vs job role description match

| Resume Type     | Applied For | ML Score | Semantic Match | **FINAL SCORE** |
| --------------- | ----------- | -------- | -------------- | --------------- |
| Senior Engineer | SENIOR      | 0.969    | 0.783          | **0.858**       |
| Junior Engineer | JUNIOR      | 0.348    | 0.811          | **0.626**       |
| Fresher         | Entry Level | 0.248    | 0.764          | **0.558**       |

---

## 6. Key Findings

### 6.1 Model Loading Issues Fixed

- **Issue**: Trained models were not being loaded during inference
- **Root Cause**: Incorrect path in `TRAINED_MODELS_DIR` variable
- **Fix**: Changed from `Path(__file__).parent` to `Path(__file__).parent.parent`
- **Result**: All 3 models now load correctly

### 6.2 Job Role Consideration

- The ML model predicts suitability based on **resume content quality**
- The **semantic match** component compares resume to **job role requirements**
- Final score = 0.4 × ML_Score + 0.6 × Semantic_Match
- This ensures fresher/junior candidates can score well for appropriate roles

---

## 7. Files Generated

```
django_pg_backend/core/apps/analytics/management/trained_models/
├── suitability_model_v2.pkl         (273 KB)
├── growth_model_v2.pkl              (409 KB)
├── authenticity_model_v2.pkl        (216 KB)
├── embedding_config.json             (252 B)
├── training_metadata.json            (925 B)
└── training_report.md                (989 B)
```

---

## 8. Recommendations for Improvement

1. **Add More Fresher Samples**: The training dataset has fewer fresher-level resumes, causing lower authenticity scores for freshers
2. **Role-Specific Training**: Train separate models per job family (Frontend, Backend, Data Science, etc.)
3. **Continuous Learning**: Implement feedback loop to improve labels based on hiring outcomes

---

## 9. Conclusion

✅ **Training Status**: Complete  
✅ **Models Deployed**: Yes  
✅ **Accuracy**: 94% (suitability classification)  
✅ **Inference Working**: Yes (with job role consideration)

The ML pipeline is fully operational best. For results, always provide the target job role during resume the semantic matching component analysis to leverage
