# Run Training with GPU

First, install required packages in the gpu_env:

```bash
gpu_env\Scripts\pip.exe install django psycopg2-binary openai pymupdf4llm sentence-transformers pandas scikit-learn numpy joblib
```

Then run training:

```bash
cd django_pg_backend\core
set PYTHONPATH=%CD%
gpu_env\Scripts\python.exe manage.py train_models_v2
```

Or use full paths:

```bash
cd e:\CSU Internship\AI-Talent-Intelligence-Platform\django_pg_backend\core
set PYTHONPATH=e:\CSU Internship\AI-Talent-Intelligence-Platform\django_pg_backend\core
e:\CSU Internship\AI-Talent-Intelligence-Platform\gpu_env\Scripts\python.exe manage.py train_models_v2
```

**Expected speed improvement:**

- CPU: ~80-100 minutes for 10,000 resumes
- GPU (RTX 3050): ~10-15 minutes for 10,000 resumes
