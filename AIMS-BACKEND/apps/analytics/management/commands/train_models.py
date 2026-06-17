"""
Django Management Command to Train ML Models
============================================

Usage:
    python manage.py train_models
"""

import os
import pickle
import json
import pandas as pd
import numpy as np
from datetime import datetime
from django.core.management.base import BaseCommand
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, mean_squared_error, r2_score, mean_absolute_error
)
from xgboost import XGBClassifier, XGBRegressor


class Command(BaseCommand):
    help = 'Train ML models for the Talent Intelligence System'
    
    # Configuration
    DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), 'docs', 'synthetic_resume_training_dataset.csv')
    MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'trained_models')
    RANDOM_STATE = 42
    
    # Feature columns
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
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS('ML TALENT INTELLIGENCE - MODEL TRAINING'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        # Load data
        df = self.load_data()
        
        # Show distribution
        self.stdout.write(f"\nTotal samples: {len(df)}")
        self.stdout.write(f"Roles: {df['role'].value_counts().to_dict()}")
        
        # Train models
        models, feature_importances = self.train_all_models(df)
        
        # Save models
        self.save_models(models, feature_importances, df)
        
        # Generate report
        self.generate_report(models, feature_importances, df)
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('TRAINING COMPLETE!'))
        self.stdout.write(self.style.SUCCESS('='*60))
    
    def load_data(self):
        """Load training data."""
        self.stdout.write("\nLoading training data...")
        df = pd.read_csv(self.DATA_PATH)
        
        # Convert boolean columns
        bool_cols = ['quantified_impact_presence', 'mandatory_skill_coverage']
        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].map({True: 1, False: 0, 'True': 1, 'False': 0})
        
        self.stdout.write(f"Loaded {len(df)} samples")
        return df
    
    def prepare_features(self, df):
        """Prepare feature matrix."""
        X = df[self.FEATURE_COLS].copy()
        X = X.fillna(X.median())
        return X
    
    def train_suitability_model(self, X, y):
        """Train suitability classification model."""
        self.stdout.write("\n" + "="*60)
        self.stdout.write("Training Suitability Classification Model")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.RANDOM_STATE, stratify=y
        )
        
        model = XGBClassifier(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=self.RANDOM_STATE,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        self.stdout.write(f"  Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
        self.stdout.write(f"  ROC-AUC:   {roc_auc_score(y_test, y_prob):.4f}")
        
        importance = pd.DataFrame({
            'feature': self.FEATURE_COLS,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        return model, importance
    
    def train_regression_model(self, X, y, target_name):
        """Train regression model."""
        self.stdout.write(f"\nTraining {target_name} Regression Model")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.RANDOM_STATE
        )
        
        model = XGBRegressor(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=self.RANDOM_STATE
        )
        
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        
        self.stdout.write(f"  R² Score: {r2_score(y_test, y_pred):.4f}")
        
        return model
    
    def train_classification_model(self, X, y, target_name):
        """Train classification model."""
        self.stdout.write(f"\nTraining {target_name} Classification Model")
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.RANDOM_STATE, stratify=y
        )
        
        model = XGBClassifier(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=self.RANDOM_STATE,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        self.stdout.write(f"  Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
        self.stdout.write(f"  ROC-AUC:   {roc_auc_score(y_test, y_prob):.4f}")
        
        return model
    
    def train_all_models(self, df):
        """Train all models."""
        X = self.prepare_features(df)
        
        models = {}
        feature_importances = {}
        
        # Suitability
        y = df[self.TARGET_COLS['suitability']].fillna(0).astype(int)
        models['suitability'], feature_importances['suitability'] = self.train_suitability_model(X, y)
        
        # Growth
        y = df[self.TARGET_COLS['growth']].fillna(0)
        models['growth'] = self.train_regression_model(X, y, 'Growth')
        
        # Authenticity
        y = df[self.TARGET_COLS['authenticity']].fillna(0).astype(int)
        models['authenticity'] = self.train_classification_model(X, y, 'Authenticity')
        
        # Communication
        y = df[self.TARGET_COLS['communication']].fillna(0)
        models['communication'] = self.train_regression_model(X, y, 'Communication')
        
        # Leadership
        y = df[self.TARGET_COLS['leadership']].fillna(0).astype(int)
        models['leadership'] = self.train_classification_model(X, y, 'Leadership')
        
        return models, feature_importances
    
    def save_models(self, models, feature_importances, df):
        """Save trained models."""
        self.stdout.write("\nSaving models...")
        
        os.makedirs(self.MODEL_DIR, exist_ok=True)
        
        for name, model in models.items():
            filepath = os.path.join(self.MODEL_DIR, f'{name}_model.pkl')
            with open(filepath, 'wb') as f:
                pickle.dump(model, f)
            self.stdout.write(f"  Saved {name} model")
        
        for name, importance in feature_importances.items():
            filepath = os.path.join(self.MODEL_DIR, f'{name}_feature_importance.csv')
            importance.to_csv(filepath, index=False)
        
        # Save metadata
        metadata = {
            'trained_at': datetime.now().isoformat(),
            'feature_columns': self.FEATURE_COLS,
            'target_columns': self.TARGET_COLS,
            'training_samples': len(df),
            'random_state': self.RANDOM_STATE
        }
        
        metadata_path = os.path.join(self.MODEL_DIR, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f"Models saved to: {self.MODEL_DIR}"))
    
    def generate_report(self, models, feature_importances, df):
        """Generate training report."""
        report = []
        report.append("# ML Talent Intelligence Model Training Report")
        report.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"\n**Training Samples:** {len(df)}")
        report.append(f"\n**Features:** {len(self.FEATURE_COLS)}")
        report.append("\n## Model Performance Summary")
        report.append("\n### 1. Suitability Classification")
        report.append("- XGBoost Classifier for interview shortlist prediction")
        report.append("- Top features:")
        for _, row in feature_importances['suitability'].head(5).iterrows():
            report.append(f"  - {row['feature']}: {row['importance']:.4f}")
        report.append("\n### 2. Growth Potential Regression")
        report.append("- XGBoost Regressor for growth potential (0-1)")
        report.append("\n### 3. Authenticity Classification")
        report.append("- XGBoost Classifier for resume inflation detection")
        report.append("\n### 4. Communication Score Regression")
        report.append("- XGBoost Regressor for communication skills (0-1)")
        report.append("\n### 5. Leadership Classification")
        report.append("- XGBoost Classifier for leadership potential")
        report.append("\n## Usage")
        report.append("```python")
        report.append("import pickle")
        report.append("")
        report.append("with open('trained_models/suitability_model.pkl', 'rb') as f:")
        report.append("    model = pickle.load(f)")
        report.append("")
        report.append("prediction = model.predict(features)")
        report.append("```")
        
        report_path = os.path.join(self.MODEL_DIR, 'training_report.md')
        with open(report_path, 'w') as f:
            f.write("\n".join(report))
        
        self.stdout.write(self.style.SUCCESS(f"Report saved to: {report_path}"))
