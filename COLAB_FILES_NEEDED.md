# Files needed for Colab Training

#

# Upload these files to Colab and run standalone_train.py

# REQUIRED FILES (upload to Colab):

# ================================

# 1. Core Django files:

# - manage.py

# - core/settings.py

# - core/**init**.py

# - core/asgi.py

# - core/wsgi.py

# - core/urls.py

# 2. Apps:

# - apps/**init**.py

# - apps/analytics/**init**.py

# - apps/analytics/apps.py

# - apps/analytics/models.py (may be large - may need to simplify)

# - apps/analytics/management/**init**.py

# - apps/analytics/management/commands/**init**.py

# - apps/analytics/management/commands/train_models_v2.py

# 3. Services (needed by train_models_v2):

# - apps/analytics/services/**init**.py

# - apps/analytics/services/embedding_engine.py

# - apps/analytics/services/feature_engineering_advanced.py

# - apps/analytics/services/suitability_scorer.py

# - apps/analytics/services/ml_models.py

# 4. Dataset:

# - django_pg_backend/core/docs/it_resume_dataset_10000_v2.csv

# 5. Requirements:

# - django_pg_backend/core/requirements.txt

# RECOMMENDED: Just use Git clone instead!

#

# In Colab cell:

# !git clone https://github.com/YOUR_USERNAME/AI-Talent-Intelligence-Platform.git

#

# Then:

# cd AI-Talent-Intelligence-Platform

# pip install -r django_pg_backend/core/requirements.txt

# python django_pg_backend/core/manage.py train_models_v2
