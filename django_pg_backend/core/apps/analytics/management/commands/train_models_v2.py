"""
Training Script for v2.0 ML Models
===================================

This script trains the ML models using the synthetic resume dataset.
It generates embeddings from resume sections and trains XGBoost classifiers.

Usage:
    python manage.py train_models_v2

Author: AI Talent Intelligence Platform v2.0
"""

import os
import sys
import json
import logging
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

# Setup Django environment
import django
from django.conf import settings

# Add the core directory to the path
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Setup Django
django.setup()

# Django management command base
from django.core.management.base import BaseCommand, CommandError

# ML Libraries
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report, 
    roc_auc_score, 
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    r2_score
)
import pickle

# Import our embedding engine
from apps.analytics.services.embedding_engine import EmbeddingEngine

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings('ignore')


# ============================================================================
# CONFIGURATION
# ============================================================================

class TrainConfig:
    """Configuration for model training."""
    # Paths - using new high-value dataset
    DATASET_PATH = BASE_DIR / 'docs' / 'it_resume_dataset_10000_v2.csv'
    MODEL_OUTPUT_DIR = BASE_DIR / 'apps' / 'analytics' / 'management' / 'trained_models'
    
    # Training parameters
    TEST_SIZE = 0.2
    RANDOM_STATE = 42
    CV_FOLDS = 5
    # Use smaller subset for faster training (set to None for all data)
    MAX_SAMPLES = 2000  # Reduce from 10,000 to 2,000 for 5x faster training
    
    # Model parameters for XGBoost
    XGBOOST_PARAMS = {
        'objective': 'binary:logistic',
        'eval_metric': 'logloss',
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 200,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': RANDOM_STATE,
        'n_jobs': -1,
        'verbosity': 0
    }


# ============================================================================
# DATA LOADING
# ============================================================================

def load_dataset(config: TrainConfig) -> pd.DataFrame:
    """Load the synthetic resume dataset."""
    logger.info(f"Loading dataset from {config.DATASET_PATH}")
    
    if not config.DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {config.DATASET_PATH}")
    
    df = pd.read_csv(config.DATASET_PATH)
    
    # Use smaller subset for faster training
    if config.MAX_SAMPLES and len(df) > config.MAX_SAMPLES:
        logger.info(f"Using {config.MAX_SAMPLES} samples instead of {len(df)} for faster training")
        # Stratified sampling to preserve class distribution
        from sklearn.model_selection import train_test_split
        df, _ = train_test_split(
            df, 
            test_size=1 - config.MAX_SAMPLES/len(df),
            stratify=df['suitability_label'],
            random_state=config.RANDOM_STATE
        )
    
    logger.info(f"Loaded {len(df)} records")
    logger.info(f"Columns: {list(df.columns)}")
    logger.info(f"Label distribution:\n{df['suitability_label'].value_counts()}")
    
    return df


def prepare_resume_text(row: pd.Series) -> dict:
    """Prepare resume text sections for embedding generation."""
    # Combine all text fields into sections as expected by embedding engine
    sections = {
        'professional_summary': str(row.get('professional_summary', '')) if pd.notna(row.get('professional_summary')) else '',
        'technical_skills': str(row.get('technical_skills', '')) if pd.notna(row.get('technical_skills')) else '',
        'frameworks_libraries': str(row.get('frameworks_libraries', '')) if pd.notna(row.get('frameworks_libraries')) else '',
        'tools_technologies': str(row.get('tools_technologies', '')) if pd.notna(row.get('tools_technologies')) else '',
        'experience_descriptions': str(row.get('experience_descriptions', '')) if pd.notna(row.get('experience_descriptions')) else '',
        'project_descriptions': str(row.get('project_descriptions', '')) if pd.notna(row.get('project_descriptions')) else '',
        'education_text': str(row.get('education_text', '')) if pd.notna(row.get('education_text')) else '',
        'certifications': str(row.get('certifications', '')) if pd.notna(row.get('certifications')) else '',
    }
    
    # Also combine for full resume text
    sections['full_resume'] = ' '.join([
        sections['professional_summary'],
        sections['technical_skills'],
        sections['experience_descriptions'],
        sections['project_descriptions'],
        sections['education_text']
    ])
    
    return sections


# ============================================================================
# EMBEDDING GENERATION
# ============================================================================

def generate_embeddings(df: pd.DataFrame, embedding_engine: EmbeddingEngine, batch_size: int = 64) -> np.ndarray:
    """Generate embeddings for all resumes in the dataset."""
    logger.info("Generating embeddings for all resumes...")
    
    all_embeddings = []
    total = len(df)
    
    for idx, row in df.iterrows():
        if idx % 1000 == 0:
            logger.info(f"Processing {idx}/{total} ({100*idx/total:.1f}%)")
        
        # Prepare resume sections
        sections = prepare_resume_text(row)
        
        # Generate section embeddings
        section_embeddings = embedding_engine.generate_section_embeddings(sections)
        
        if section_embeddings:
            # Compute weighted resume vector
            combined_vector = embedding_engine.compute_resume_vector(section_embeddings)
            all_embeddings.append(combined_vector)
        else:
            # Fallback to zeros if embedding fails
            all_embeddings.append(np.zeros(embedding_engine.config.embedding_dim))
    
    logger.info(f"Generated {len(all_embeddings)} embeddings")
    return np.array(all_embeddings)


# ============================================================================
# MODEL TRAINING
# ============================================================================

def train_suitability_model(
    X: np.ndarray, 
    y: np.ndarray, 
    config: TrainConfig
) -> tuple:
    """Train the suitability classifier."""
    logger.info("Training Suitability Classifier...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=config.TEST_SIZE, 
        random_state=config.RANDOM_STATE,
        stratify=y
    )
    
    logger.info(f"Training set size: {len(X_train)}")
    logger.info(f"Test set size: {len(X_test)}")
    
    # Train XGBoost classifier with class weight handling
    # Calculate scale_pos_weight for imbalanced classes
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    scale_pos_weight = pos_count / neg_count if neg_count > 0 else 1
    
    model_params = config.XGBOOST_PARAMS.copy()
    model_params['scale_pos_weight'] = scale_pos_weight  # Balance the classes
    
    model = xgb.XGBClassifier(**model_params)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    logger.info("\n" + "="*50)
    logger.info("SUITABILITY MODEL EVALUATION")
    logger.info("="*50)
    logger.info(f"Accuracy:  {accuracy:.4f}")
    logger.info(f"Precision: {precision:.4f}")
    logger.info(f"Recall:    {recall:.4f}")
    logger.info(f"F1 Score:  {f1:.4f}")
    logger.info(f"ROC-AUC:   {roc_auc:.4f}")
    logger.info("="*50)
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=config.CV_FOLDS, scoring='roc_auc')
    logger.info(f"Cross-Validation ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    
    # Classification report
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred, target_names=['REJECT', 'SHORTLIST']))
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    logger.info(f"\nConfusion Matrix:\n{cm}")
    
    return model, {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'roc_auc': roc_auc,
        'cv_scores': cv_scores.tolist(),
        'cv_mean': cv_scores.mean(),
        'cv_std': cv_scores.std()
    }


def train_growth_model(
    X: np.ndarray, 
    y: np.ndarray, 
    config: TrainConfig
) -> tuple:
    """Train a growth potential predictor (regression)."""
    logger.info("Training Growth Potential Predictor...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=config.TEST_SIZE, 
        random_state=config.RANDOM_STATE
    )
    
    # Train XGBoost regressor
    regressor_params = config.XGBOOST_PARAMS.copy()
    regressor_params['objective'] = 'reg:squarederror'
    regressor_params['n_estimators'] = 150
    
    model = xgb.XGBRegressor(**regressor_params)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    # Calculate R² score
    r2 = r2_score(y_test, y_pred)
    
    logger.info(f"Growth Model R² Score: {r2:.4f}")
    
    return model, {'r2_score': r2}


def train_authenticity_model(
    X: np.ndarray, 
    y: np.ndarray, 
    config: TrainConfig
) -> tuple:
    """Train an authenticity classifier."""
    logger.info("Training Authenticity Classifier...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=config.TEST_SIZE, 
        random_state=config.RANDOM_STATE,
        stratify=y
    )
    
    # Use same training but with slightly different threshold for authenticity
    # Since we don't have explicit authenticity labels, we'll use suitability as proxy
    # In production, this would need separate labels
    
    # Train XGBoost classifier with different parameters
    auth_params = config.XGBOOST_PARAMS.copy()
    auth_params['max_depth'] = 5
    auth_params['n_estimators'] = 150
    
    model = xgb.XGBClassifier(**auth_params)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    precision = precision_score(y_test, y_pred)
    logger.info(f"Authenticity Model Precision: {precision:.4f}")
    
    return model, {'precision': precision}


# ============================================================================
# MODEL SAVING
# ============================================================================

def save_models(
    suitability_model,
    growth_model,
    authenticity_model,
    embedding_engine: EmbeddingEngine,
    metrics: dict,
    config: TrainConfig
) -> None:
    """Save all trained models."""
    logger.info("Saving trained models...")
    
    # Ensure output directory exists
    config.MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save suitability model
    suitability_path = config.MODEL_OUTPUT_DIR / 'suitability_model_v2.pkl'
    with open(suitability_path, 'wb') as f:
        pickle.dump(suitability_model, f)
    logger.info(f"Saved suitability model to {suitability_path}")
    
    # Save growth model
    growth_path = config.MODEL_OUTPUT_DIR / 'growth_model_v2.pkl'
    with open(growth_path, 'wb') as f:
        pickle.dump(growth_model, f)
    logger.info(f"Saved growth model to {growth_path}")
    
    # Save authenticity model
    authenticity_path = config.MODEL_OUTPUT_DIR / 'authenticity_model_v2.pkl'
    with open(authenticity_path, 'wb') as f:
        pickle.dump(authenticity_model, f)
    logger.info(f"Saved authenticity model to {authenticity_path}")
    
    # Save embedding engine config (for consistency)
    embedding_config_path = config.MODEL_OUTPUT_DIR / 'embedding_config.json'
    config_data = {
        'model_name': embedding_engine.config.model_name,
        'embedding_dim': embedding_engine.config.embedding_dim,
        'weights': embedding_engine.config.weights,
        'trained_at': datetime.now().isoformat()
    }
    with open(embedding_config_path, 'w') as f:
        json.dump(config_data, f, indent=2)
    logger.info(f"Saved embedding config to {embedding_config_path}")
    
    # Save training metadata
    metadata = {
        'training_date': datetime.now().isoformat(),
        'dataset_path': str(config.DATASET_PATH),
        'dataset_size': len(pd.read_csv(config.DATASET_PATH)),
        'embedding_dim': embedding_engine.config.embedding_dim,
        'metrics': metrics,
        'model_version': 'transformer_xgb_v2'
    }
    
    metadata_path = config.MODEL_OUTPUT_DIR / 'training_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved training metadata to {metadata_path}")
    
    # Save feature importance if available
    if hasattr(suitability_model, 'feature_importances_'):
        importance_df = pd.DataFrame({
            'feature': [f'dim_{i}' for i in range(len(suitability_model.feature_importances_))],
            'importance': suitability_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        importance_path = config.MODEL_OUTPUT_DIR / 'suitability_feature_importance_v2.csv'
        importance_df.to_csv(importance_path, index=False)
        logger.info(f"Saved feature importance to {importance_path}")
    
    logger.info("All models saved successfully!")


# ============================================================================
# DJANGO MANAGEMENT COMMAND
# ============================================================================

class Command(BaseCommand):
    """Django management command for training v2.0 ML models."""
    
    help = 'Train ML models using the synthetic resume dataset (v2.0)'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS('AI TALENT INTELLIGENCE PLATFORM v2.0 - MODEL TRAINING'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        config = TrainConfig()
        
        try:
            # Step 1: Load dataset
            self.stdout.write(self.style.HTTP_INFO('\n[1/5] Loading dataset...'))
            df = load_dataset(config)
            self.stdout.write(self.style.SUCCESS(f'Loaded {len(df)} records'))
            
            # Step 2: Initialize embedding engine
            self.stdout.write(self.style.HTTP_INFO('\n[2/5] Initializing embedding engine...'))
            embedding_engine = EmbeddingEngine()
            self.stdout.write(self.style.SUCCESS(f'Using model: {embedding_engine.config.model_name}'))
            self.stdout.write(self.style.SUCCESS(f'Embedding dimension: {embedding_engine.config.embedding_dim}'))
            
            # Step 3: Generate embeddings
            self.stdout.write(self.style.HTTP_INFO('\n[3/5] Generating embeddings (this may take a while)...'))
            X = generate_embeddings(df, embedding_engine)
            y = df['suitability_label'].values
            
            self.stdout.write(self.style.SUCCESS(f'Feature matrix shape: {X.shape}'))
            self.stdout.write(self.style.SUCCESS(f'Labels shape: {y.shape}'))
            
            # Step 4: Train models
            self.stdout.write(self.style.HTTP_INFO('\n[4/5] Training models...'))
            
            # Train suitability classifier
            suitability_model, suitability_metrics = train_suitability_model(X, y, config)
            
            # Train growth potential predictor
            growth_model, growth_metrics = train_growth_model(X, y, config)
            
            # Train authenticity classifier
            authenticity_model, authenticity_metrics = train_authenticity_model(X, y, config)
            
            # Collect all metrics
            all_metrics = {
                'suitability': suitability_metrics,
                'growth': growth_metrics,
                'authenticity': authenticity_metrics,
                'embedding_dim': embedding_engine.config.embedding_dim,
                'dataset_size': len(df)
            }
            
            # Step 5: Save models
            self.stdout.write(self.style.HTTP_INFO('\n[5/5] Saving models...'))
            save_models(
                suitability_model,
                growth_model,
                authenticity_model,
                embedding_engine,
                all_metrics,
                config
            )
            
            self.stdout.write(self.style.SUCCESS('\n' + '='*60))
            self.stdout.write(self.style.SUCCESS('TRAINING COMPLETE!'))
            self.stdout.write(self.style.SUCCESS('='*60))
            self.stdout.write(self.style.SUCCESS(f'Models saved to: {config.MODEL_OUTPUT_DIR}'))
            self.stdout.write(self.style.SUCCESS(f'Best ROC-AUC: {suitability_metrics["roc_auc"]:.4f}'))
            
        except Exception as e:
            raise CommandError(f'Training failed: {str(e)}')
