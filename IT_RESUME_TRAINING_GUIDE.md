# IT Sector Resume Data Collection & Model Training Guide

## As a ML Engineer with 5+ Years of Experience

---

## Part 1: Collecting IT Sector Resume Data

### 1. Data Sources for IT Resumes

| Source                      | Type               | Pros                                    | Cons                                   |
| --------------------------- | ------------------ | --------------------------------------- | -------------------------------------- |
| **LinkedIn**                | Public profiles    | Rich technical data, real professionals | Scraping restrictions, limited access  |
| **GitHub**                  | Profiles & READMEs | Code samples, projects                  | No resume format, biased to developers |
| **Kaggle Datasets**         | Pre-collected      | Ready to use                            | May be outdated, generic               |
| **Resume Databases**        | Paid services      | High quality, labeled                   | Costly                                 |
| **Internal HR Data**        | Company resumes    | Real hiring decisions                   | Limited volume                         |
| **Resume Parsing Services** | Indeed, Glassdoor  | Aggregate data                          | Restricted access                      |

### 2. Recommended Public Datasets

```
- LinkedIn Resume Dataset (Kaggle)
- Resume Dataset (Kaggle - 2.5K samples)
- Indeed Resume Data (if available)
- Common Crawl (filtered for resumes)
- HR Analytics Dataset
```

### 3. Data Collection Strategy

```python
# Recommended approach for IT resume collection:
# 1. Use publicly available resume datasets
# 2. Scrape from job portals (with permission/TOS)
# 3. Partner with recruitment agencies
# 4. Use synthetic data generation (with real-world patterns)
```

### 4. Required Resume Fields for IT Sector

| Field                     | Importance | Description                                |
| ------------------------- | ---------- | ------------------------------------------ |
| `professional_summary`    | High       | Career objective, key highlights           |
| `technical_skills`        | Critical   | Programming languages, frameworks          |
| `tools_technologies`      | High       | DevOps, cloud, IDEs                        |
| `experience_descriptions` | Critical   | Job titles, responsibilities, achievements |
| `project_descriptions`    | High       | GitHub, personal, work projects            |
| `education_text`          | Medium     | Degrees, certifications                    |
| `certifications`          | High       | AWS, Azure, GCP, Cisco, etc.               |
| `applied_role`            | Critical   | Target role for classification             |

---

## Part 2: Training the Resume Suitability Model

### 1. Data Preprocessing Pipeline

```
Raw Resume → PDF Extraction → LLM Parsing → Structured Data → Feature Engineering → Training
```

### 2. Feature Engineering for IT Resumes

```python
# Key features to extract:
1. Technical Skills Match Score
   - Programming languages known
   - Frameworks proficiency
   - Tools & technologies

2. Experience Features
   - Years of experience
   - Seniority level (Junior/Mid/Senior/Lead)
   - Domain expertise

3. Project Complexity Score
   - Scale of projects (small/medium/large)
   - Technology stack depth
   - Leadership indicators

4. Education & Certifications
   - Degree relevance
   - Certification value (AWS, GCP, etc.)
   - Continuous learning indicators

5. Semantic Features
   - Embedding similarity to job description
   - Section-wise matching
```

### 3. Recommended Model Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ENSEMBLE APPROACH                        │
├─────────────────────────────────────────────────────────────┤
│  1. Gradient Boosting (XGBoost/LightGBM)                 │
│     - Handles tabular features well                        │
│     - Feature importance interpretability                  │
│                                                             │
│  2. Neural Network (optional)                              │
│     - For semantic similarity learning                     │
│     - Cross-encoder for re-ranking                         │
│                                                             │
│  3. Logistic Regression (baseline)                         │
│     - Simple, interpretable                                │
│     - Good for probability calibration                    │
└─────────────────────────────────────────────────────────────┘
```

### 4. Training Configuration

```python
# Recommended hyperparameters for IT resume classification:

# For Random Forest / Gradient Boosting:
- n_estimators: 200-500
- max_depth: 10-20
- min_samples_split: 5-10
- min_samples_leaf: 2-5
- class_weight: 'balanced'  # Handle imbalance

# For embeddings:
- Model: BAAI/bge-large-en-v1.5
- Dimensions: 1024
- Pooling: Weighted mean (experience: 40%, skills: 25%, etc.)
```

### 5. Labeling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   LABEL DEFINITIONS                         │
├─────────────────────────────────────────────────────────────┤
│  suitability_label = 1 (Positive):                         │
│    - Has required technical skills                          │
│    - Relevant experience for role                          │
│    - Meets minimum qualifications                          │
│                                                             │
│  suitability_label = 0 (Negative):                        │
│    - Missing critical skills                               │
│    - Insufficient experience                                │
│    - Wrong domain/role                                     │
└─────────────────────────────────────────────────────────────┘
```

### 6. Training Data Quality Checklist

- [ ] Minimum 5,000 samples per target role
- [ ] Balanced classes (40-60% positive recommended)
- [ ] Diverse experience levels (Junior/Mid/Senior)
- [ ] Multiple companies and industries represented
- [ ] Real-world noise (真实数据，不要全部clean)
- [ ] Expert validation on subset (HR/Technical screening)

### 7. Validation Strategy

```python
# Split strategy:
- Train: 70%
- Validation: 15%
- Test: 15%

# Metrics to track:
- Precision, Recall, F1-Score
- ROC-AUC
- Confusion Matrix
- Feature Importance
```

---

## Part 3: Current Implementation in This Project

### Training Command

```bash
cd django_pg_backend/core
python manage.py train_models_v2
```

### Dataset Location

```
django_pg_backend/core/docs/synthetic_resume_dataset_20000_advanced.csv
```

### Current Model Outputs

- **Suitability Score**: How well resume matches job
- **Growth Score**: Potential for career advancement
- **Communication Score**: Soft skills indicator
- **Authenticity Score**: Resume authenticity check

---

## Part 4: Recommendations for Production

### 1. Data Collection Priority

1. **Phase 1**: Use synthetic data + existing resumes (current)
2. **Phase 2**: Partner with HR to get real labeled data
3. **Phase 3**: Implement feedback loop (HR decisions → training data)

### 2. Model Improvement Roadmap

```
Month 1:  Baseline model with synthetic data
Month 2:  Collect 1000+ real resumes, retrain
Month 3:  Add re-ranking model (cross-encoder)
Month 6:  Fine-tune embeddings on IT domain
```

### 3. Key Metrics to Monitor

- **Shortlisting Accuracy**: % of recommended candidates hired
- **False Positive Rate**: Rejecting good candidates
- **False Negative Rate**: Accepting poor candidates
- **Semantic Score Distribution**: Should be 0.65+ for good matches

---

## Summary

As an ML Engineer, I would recommend:

1. **Start with synthetic/augmented data** for initial model (current approach ✓)
2. **Collect real IT resumes** from multiple sources gradually
3. **Use LLM for parsing** (not regex) - critical for quality
4. **Invest in embeddings** - bge-large-en-v1.5 or voyage-3-large
5. **Build feedback loop** - HR decisions improve model over time

The current implementation is on the right track with LLM-based parsing and proper embeddings!
