
### Components Built:

1. **LLM Resume Parser** - Uses GPT-4o-mini via GitHub Models API
2. **Embedding Engine** - Uses BAAI/bge-large-en-v1.5 (1024 dimensions)
3. **ML Models (XGBoost)**:
   - suitability_model_v2.pkl
   - growth_model_v2.pkl
   - authenticity_model_v2.pkl
4. **Training Pipeline** - `train_models_v2.py` with 2,000 sample configuration

### training dtaatset

- E:\CSU Internship\AI-Talent-Intelligence-Platform\django_pg_backend\core\docs\it_resume_dataset_10000_v2.csv

### next step :

- train the model