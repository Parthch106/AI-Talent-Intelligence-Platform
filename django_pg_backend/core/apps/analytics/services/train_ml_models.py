import pandas as pd
import numpy as np
import os
import pickle
import json
import logging
from datetime import datetime
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, mean_squared_error, r2_score, mean_absolute_error
)
from xgboost import XGBClassifier, XGBRegressor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
DATA_PATH = 'django_pg_backend/core/docs/synthetic_resume_training_dataset.csv'
MODEL_DIR = 'django_pg_backend/core/apps/analytics/services/trained_models'
RANDOM_STATE = 42

# Feature columns (excluding ID and role)
FEATURE_COLS = [
    'skill_match_ratio', 'domain_similarity_score', 'skill_depth_score',
    'project_complexity_score', 'skill_project_consistency', 'degree_level_encoded',
    'gpa_normalized', 'university_tier_score', 'coursework_relevance_score',
    'experience_duration_months', 'internship_relevance_score', 'open_source_score',
    'hackathon_count', 'project_count', 'quantified_impact_presence',
    'production_tools_usage_score', 'github_activity_score', 'keyword_stuffing_ratio',
    'resume_consistency_score', 'writing_clarity_score', 'action_verb_density',
    'resume_length_normalized', 'mandatory_skill_coverage', 'critical_skill_gap_count'
]

# Target columns
TARGET_COLS = {
    'suitability': 'suitability_label',
    'growth': 'growth_score',
    'authenticity': 'authenticity_label',
    'communication': 'communication_label',
    'leadership': 'leadership_label'
}

# Role-specific weights for suitability
ROLE_WEIGHTS = {
    'ML_ENGINEER': {
        'skill_match_ratio': 1.3,
        'domain_similarity_score': 1.2,
        'project_complexity_score': 1.1,
    },
    'DATA_ANALYST': {
        'skill_match_ratio': 1.2,
        'gpa_normalized': 1.1,
        'coursework_relevance_score': 1.1,
    },
    'BACKEND_DEVELOPER': {
        'skill_match_ratio': 1.3,
        'experience_duration_months': 1.1,
        'production_tools_usage_score': 1.2,
    },
    'FULL_STACK_DEVELOPER': {
        'skill_match_ratio': 1.3,
        'skill_depth_score': 1.2,
        'project_count': 1.1,
    },
    'AI_RESEARCH_INTERN': {
        'domain_similarity_score': 1.3,
        'skill_match_ratio': 1.2,
        'research_experience': 1.2,
    }
}


def load_data():
    """Load and preprocess training data."""
    logger.info("Loading training data...")
    try:
        df = pd.read_csv(DATA_PATH)
        logger.info(f"Loaded {len(df)} samples with {len(df.columns)} columns")
        
        # Convert boolean columns
        bool_cols = ['quantified_impact_presence', 'mandatory_skill_coverage']
        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].map({True: 1, False: 0, 'True': 1, 'False': 0})
        
        return df
    except Exception as e:
        logger.error(f"Failed to load training data from {DATA_PATH}: {e}")
        raise


def prepare_features(df):
    """Prepare feature matrix."""
    X = df[FEATURE_COLS].copy()
    
    # Handle missing values
    X = X.fillna(X.median())
    
    return X


def train_suitability_model(X, y):
    """Train suitability classification model."""
    logger.info("Training Suitability Classification Model")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    
    # Train XGBoost classifier
    model = XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    logger.info(
        f"Suitability Results: accuracy={accuracy_score(y_test, y_pred):.4f} "
        f"precision={precision_score(y_test, y_pred):.4f} "
        f"recall={recall_score(y_test, y_pred):.4f} "
        f"f1={f1_score(y_test, y_pred):.4f} "
        f"auc={roc_auc_score(y_test, y_prob):.4f}"
    )
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    logger.info(f"Cross-Validation Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': FEATURE_COLS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    # Log top 5 features
    top_5 = importance.head(5).to_dict('records')
    logger.info(f"Top 5 Suitability Features: {top_5}")
    
    return model, importance


def train_regression_model(X, y, target_name):
    """Train regression model for continuous targets."""
    logger.info(f"Training {target_name} Regression Model")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )
    
    # Train XGBoost regressor
    model = XGBRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    logger.info(
        f"{target_name} Results: r2={r2_score(y_test, y_pred):.4f} "
        f"mae={mean_absolute_error(y_test, y_pred):.4f} "
        f"rmse={np.sqrt(mean_squared_error(y_test, y_pred)):.4f}"
    )
    
    return model


def train_classification_model(X, y, target_name):
    """Train classification model for binary targets."""
    logger.info(f"Training {target_name} Classification Model")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    
    # Train XGBoost classifier
    model = XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    logger.info(
        f"{target_name} Results: accuracy={accuracy_score(y_test, y_pred):.4f} "
        f"precision={precision_score(y_test, y_pred):.4f} "
        f"recall={recall_score(y_test, y_pred):.4f} "
        f"f1={f1_score(y_test, y_pred):.4f} "
        f"auc={roc_auc_score(y_test, y_prob):.4f}"
    )
    
    return model


def train_all_models(df):
    """Train all models."""
    logger.info("TRAINING ALL ML MODELS")
    
    # Prepare features
    X = prepare_features(df)
    
    models = {}
    feature_importances = {}
    
    # Train suitability model
    y_suitability = df[TARGET_COLS['suitability']].fillna(0).astype(int)
    models['suitability'], feature_importances['suitability'] = train_suitability_model(X, y_suitability)
    
    # Train growth regression model
    y_growth = df[TARGET_COLS['growth']].fillna(0)
    models['growth'] = train_regression_model(X, y_growth, 'Growth')
    
    # Train authenticity classification model
    y_authenticity = df[TARGET_COLS['authenticity']].fillna(0).astype(int)
    models['authenticity'] = train_classification_model(X, y_authenticity, 'Authenticity')
    
    # Train communication regression model
    y_communication = df[TARGET_COLS['communication']].fillna(0)
    models['communication'] = train_regression_model(X, y_communication, 'Communication')
    
    # Train leadership classification model
    y_leadership = df[TARGET_COLS['leadership']].fillna(0).astype(int)
    models['leadership'] = train_classification_model(X, y_leadership, 'Leadership')
    
    return models, feature_importances


def save_models(models, feature_importances):
    """Save trained models to disk."""
    logger.info("SAVING MODELS")
    
    # Create directory if not exists
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Save models
    for name, model in models.items():
        filepath = os.path.join(MODEL_DIR, f'{name}_model.pkl')
        with open(filepath, 'wb') as f:
            pickle.dump(model, f)
        logger.info(f"Saved {name} model to {filepath}")
    
    # Save feature importances
    for name, importance in feature_importances.items():
        filepath = os.path.join(MODEL_DIR, f'{name}_feature_importance.csv')
        importance.to_csv(filepath, index=False)
        logger.info(f"Saved {name} feature importance to {filepath}")
    
    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'feature_columns': FEATURE_COLS,
        'target_columns': TARGET_COLS,
        'model_types': {
            'suitability': 'XGBClassifier',
            'growth': 'XGBRegressor',
            'authenticity': 'XGBClassifier',
            'communication': 'XGBRegressor',
            'leadership': 'XGBClassifier'
        },
        'training_samples': len(pd.read_csv(DATA_PATH)),
        'random_state': RANDOM_STATE
    }
    
    metadata_path = os.path.join(MODEL_DIR, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved metadata to {metadata_path}")


def generate_model_report(models, feature_importances, df):
    """Generate a detailed model report."""
    logger.info("GENERATING MODEL REPORT")
    
    report = []
    report.append("# ML Talent Intelligence Model Training Report")
    report.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"\n**Training Samples:** {len(df)}")
    report.append(f"\n**Features:** {len(FEATURE_COLS)}")
    report.append("\n## Model Performance Summary")
    
    # Add model summaries
    report.append("\n### 1. Suitability Classification Model")
    report.append("- **Type:** XGBoost Classifier")
    report.append("- **Purpose:** Predict if candidate is suitable for interview shortlist")
    report.append("- **Key Features:**")
    for _, row in feature_importances['suitability'].head(5).iterrows():
        report.append(f"  - {row['feature']}: {row['importance']:.4f}")
    
    report.append("\n### 2. Growth Potential Regression Model")
    report.append("- **Type:** XGBoost Regressor")
    report.append("- **Purpose:** Predict candidate's growth potential score (0-1)")
    
    report.append("\n### 3. Authenticity Classification Model")
    report.append("- **Type:** XGBoost Classifier")
    report.append("- **Purpose:** Detect resume inflation/fabrication")
    
    report.append("\n### 4. Communication Score Regression Model")
    report.append("- **Type:** XGBoost Regressor")
    report.append("- **Purpose:** Predict communication skills score (0-1)")
    
    report.append("\n### 5. Leadership Classification Model")
    report.append("- **Type:** XGBoost Classifier")
    report.append("- **Purpose:** Predict leadership potential")
    
    report.append("\n## Role-Specific Weight Adjustments")
    for role, weights in ROLE_WEIGHTS.items():
        report.append(f"\n### {role}")
        for feature, weight in weights.items():
            report.append(f"- {feature}: ×{weight}")
    
    report.append("\n## Usage")
    report.append("```python")
    report.append("from apps.analytics.services.trained_models.inference import ModelInference")
    report.append("")
    report.append("inference = ModelInference()")
    report.append("result = inference.predict_suitability(features)")
    report.append("```")
    
    report_text = "\n".join(report)
    
    # Save report
    report_path = os.path.join(MODEL_DIR, 'training_report.md')
    with open(report_path, 'w') as f:
        f.write(report_text)
    
    logger.info(f"Saved model report to {report_path}")
    return report_text


def main():
    """Main training function."""
    logger.info("ML TALENT INTELLIGENCE - MODEL TRAINING START")
    
    # Load data
    df = load_data()
    
    # Show data distribution
    distribution = {
        'total_samples': len(df),
        'roles': df['role'].value_counts().to_dict(),
        'suitability': df['suitability_label'].value_counts().to_dict()
    }
    logger.info(f"Data Distribution: {distribution}")
    
    # Train models
    models, feature_importances = train_all_models(df)
    
    # Save models
    save_models(models, feature_importances)
    
    # Generate report
    generate_model_report(models, feature_importances, df)
    
    logger.info("TRAINING COMPLETE! Models saved to: " + MODEL_DIR)
    
    return models, feature_importances


if __name__ == '__main__':
    main()
