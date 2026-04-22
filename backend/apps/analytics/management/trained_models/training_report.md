# ML Talent Intelligence Model Training Report

**Generated:** 2026-02-13 14:38:59

**Training Samples:** 10000

**Features:** 24

## Model Performance Summary

### 1. Suitability Classification
- XGBoost Classifier for interview shortlist prediction
- Top features:
  - mandatory_skill_coverage: 0.3321
  - critical_skill_gap_count: 0.2009
  - skill_match_ratio: 0.1696
  - domain_similarity_score: 0.0612
  - project_complexity_score: 0.0343

### 2. Growth Potential Regression
- XGBoost Regressor for growth potential (0-1)

### 3. Authenticity Classification
- XGBoost Classifier for resume inflation detection

### 4. Communication Score Regression
- XGBoost Regressor for communication skills (0-1)

### 5. Leadership Classification
- XGBoost Classifier for leadership potential

## Usage
```python
import pickle

with open('trained_models/suitability_model.pkl', 'rb') as f:
    model = pickle.load(f)

prediction = model.predict(features)
```