"""
Talent Intelligence Analysis Service
===================================

Main service that orchestrates the resume analysis pipeline:
1. Resume Parsing & Feature Extraction (Phase 1)
2. Feature Engineering (Phase 2)
3. ML Model Inference (Phase 3-4)
4. Bias Mitigation (Phase 5)
5. Explainability Output (Phase 6)

This service handles the complete analysis pipeline.
"""

import logging
from typing import Dict, Any, Optional, List
from django.db import transaction

from apps.accounts.models import User
from apps.documents.models import ResumeData
from apps.analytics.models import (
    JobRole,
    Application,
    ResumeFeature,
    ModelPrediction,
    HiringOutcome,
    GrowthTracking,
    AuthenticityReview,
    ModelRegistry,
)
from .resume_parsing_engine import resume_parsing_engine
from .feature_engineering_advanced import advanced_feature_engine
from .ml_models import ml_model_registry
from .suitability_scorer import suitability_scorer, get_decision_explanation

logger = logging.getLogger(__name__)


class TalentIntelligenceService:
    """
    Enterprise-grade Talent Intelligence Analysis Service.
    
    Orchestrates the complete resume analysis pipeline:
    - Feature Extraction
    - ML Inference
    - Bias Mitigation
    - Explainability
    """
    
    # Decision thresholds
    DECISION_THRESHOLDS = {
        'INTERVIEW_SHORTLIST': 0.75,
        'TECHNICAL_ASSIGNMENT': 0.60,
        'MANUAL_REVIEW': 0.50,
    }
    
    def __init__(self):
        self.parsing_engine = resume_parsing_engine
    
    # =========================================================================
    # MAIN ANALYSIS METHODS
    # =========================================================================
    
    def analyze_resume(
        self,
        user: User,
        job_role: Optional[str] = None,
        create_application: bool = True
    ) -> Dict[str, Any]:
        """
        Main entry point for resume analysis.
        
        Args:
            user: User (intern) to analyze
            job_role: Target job role (optional)
            create_application: Whether to create Application record
            
        Returns:
            Complete analysis results
        """
        logger.info(f"Starting analysis for user: {user.email}")
        
        # 1. Get document for the user
        from apps.documents.models import Document
        document = Document.objects.filter(
            uploaded_by=user,
            document_type='RESUME'
        ).first()
        
        if not document:
            raise ValueError(f"No resume document found for user {user.email}")
        
        # 2. Create or get job role
        job_role_obj = None
        if job_role:
            job_role_obj, _ = JobRole.objects.get_or_create(
                role_title=job_role.upper(),
                defaults={
                    'role_description': f'{job_role} position',
                    'mandatory_skills': [],
                    'preferred_skills': []
                }
            )
        
        # 3. Create or get application
        application = None
        
        # Get raw text from document
        resume_raw_text = ''
        if document.raw_text:
            resume_raw_text = document.raw_text
        elif document.file:
            try:
                if document.file:
                    content = document.file.read() if hasattr(document.file, 'read') else b''
                    # Decode and filter out NUL characters
                    resume_raw_text = content.decode('utf-8', errors='ignore').replace('\x00', '')
            except:
                pass
        
        if create_application and job_role_obj:
            application, created = Application.objects.get_or_create(
                intern=user,
                job_role=job_role_obj,
                defaults={'resume_text': resume_raw_text[:10000]}  # Limit text length
            )
        
        # 4. Extract features (Phase 1) - Now uses Document directly
        raw_features = self.parsing_engine.extract_features(
            document,  # Pass Document instead of ResumeData
            job_role
        )
        
        # 5. Apply feature engineering (Phase 2)
        engineered_features = self._apply_feature_engineering(raw_features)
        
        # 6. Store features in database
        resume_feature = self._store_resume_features(
            application, 
            engineered_features
        )
        
        # 7. Run ML inference (Phase 3-4)
        predictions = self._run_ml_inference(engineered_features)
        
        # 8. Store predictions
        model_prediction = self._store_predictions(
            application,
            predictions
        )
        
        # 9. Apply bias mitigation (Phase 5)
        bias_report = self._apply_bias_mitigation(
            engineered_features,
            predictions
        )
        
        # 10. Generate explainability output (Phase 6)
        analysis_result = self._generate_explainable_output(
            user=user,
            features=engineered_features,
            predictions=predictions,
            bias_report=bias_report
        )
        
        logger.info(f"Analysis completed for user: {user.email}")
        
        return analysis_result
    
    @transaction.atomic
    def _store_resume_features(
        self,
        application: Optional[Application],
        features: Dict[str, Any]
    ) -> ResumeFeature:
        """Store extracted features in database."""
        
        # Get valid field names from ResumeFeature model
        valid_field_names = set(f.name for f in ResumeFeature._meta.get_fields())
        
        # Define additional field mapping for feature engineering layer
        field_mapping = {
            'skill_match_ratio': 'skill_match_ratio',
            'mandatory_skill_coverage': 'mandatory_skill_coverage',
            'domain_similarity_score': 'domain_similarity_score',
            'skill_depth_score': 'skill_depth_score',
            'skill_project_consistency': 'skill_project_consistency',
            'critical_skill_gap_count': 'critical_skill_gap_count',
            'degree_level_encoded': 'degree_level_encoded',
            'gpa_normalized': 'gpa_normalized',
            'university_tier_score': 'university_tier_score',
            'coursework_relevance_score': 'coursework_relevance_score',
            'experience_duration_months': 'experience_duration_months',
            'internship_relevance_score': 'internship_relevance_score',
            'open_source_score': 'open_source_score',
            'hackathon_count': 'hackathon_count',
            'project_count': 'project_count',
            'project_complexity_score': 'project_complexity_score',
            'quantified_impact_presence': 'quantified_impact_presence',
            'production_tools_usage_score': 'production_tools_usage_score',
            'github_activity_score': 'github_activity_score',
            'keyword_stuffing_ratio': 'keyword_stuffing_ratio',
            'writing_clarity_score': 'writing_clarity_score',
            'action_verb_density': 'action_verb_density',
            'resume_consistency_score': 'resume_consistency_score',
            'resume_length_normalized': 'resume_length_normalized',
        }
        
        # Filter and map features to valid model fields
        valid_features = {}
        for key, value in features.items():
            # Skip internal fields and non-numeric fields
            if key.startswith('_') or not isinstance(value, (int, float, bool)):
                continue
            
            # Map to correct field name if needed
            field_name = field_mapping.get(key, key)
            
            # Only include fields that exist in the model
            if field_name in valid_field_names:
                valid_features[field_name] = value
        
        if not application:
            # Create a temporary feature without application
            resume_feature, _ = ResumeFeature.objects.get_or_create(
                application=None,
                defaults=valid_features
            )
        else:
            resume_feature, _ = ResumeFeature.objects.update_or_create(
                application=application,
                defaults=valid_features
            )
        
        return resume_feature
    
    def _store_predictions(
        self,
        application: Optional[Application],
        predictions: Dict[str, Any]
    ) -> ModelPrediction:
        """Store ML predictions in database."""
        
        if not application:
            return None
            
        prediction, _ = ModelPrediction.objects.update_or_create(
            application=application,
            defaults={
                'suitability_score': predictions.get('suitability_score', 0),
                'technical_competency_score': predictions.get('technical_competency_score', 0),
                'growth_potential_score': predictions.get('growth_potential_score', 0),
                'resume_authenticity_score': predictions.get('resume_authenticity_score', 0),
                'communication_score': predictions.get('communication_score', 0),
                'leadership_score': predictions.get('leadership_score', 0),
                'decision': predictions.get('decision', 'MANUAL_REVIEW'),
                'model_version': predictions.get('model_version', 'v1.0'),
                'confidence_score': predictions.get('confidence_score', 0.5),
            }
        )
        
        return prediction
    
    # =========================================================================
    # PHASE 2: FEATURE ENGINEERING
    # =========================================================================
    
    def _apply_feature_engineering(
        self,
        raw_features: Dict[str, Any],
        resume_data: Any = None
    ) -> Dict[str, Any]:
        """
        Phase 2: Advanced Feature Engineering Layer
        
        Uses advanced techniques:
        - TF-IDF vectorization
        - Cosine similarity
        - Feature normalization
        - Categorical encoding
        - Resume inflation detection
        
        Args:
            raw_features: Features from Phase 1 (can include parsed data)
            resume_data: ResumeData model instance (optional, for backward compatibility)
            
        Returns:
            Engineered features ready for ML
        """
        # Extract data from raw_features (new approach) or resume_data (legacy)
        if '_parsed_data' in raw_features:
            # New approach: data is in raw_features
            parsed_data = raw_features['_parsed_data']
            resume_skills = self._normalize_skills(parsed_data.get('skills', []))
            resume_tools = self._normalize_skills(parsed_data.get('tools', []))
            all_skills = resume_skills + resume_tools
            
            projects = parsed_data.get('projects', [])
            raw_text = raw_features.get('_raw_text', '')
            job_role = parsed_data.get('applied_role', '')
        else:
            # Legacy approach: data is in resume_data
            resume_skills = self._normalize_skills(resume_data.skills or [])
            resume_tools = self._normalize_skills(resume_data.tools or [])
            all_skills = resume_skills + resume_tools
            
            projects = resume_data.projects or []
            raw_text = getattr(resume_data, 'raw_text', '') or ''
            job_role = getattr(resume_data, 'applied_role', '') or ''
        
        # Get job role requirements
        role_requirements = self._get_role_requirements_simple(job_role)
        required_skills = role_requirements.get('mandatory_skills', [])
        
        # Build advanced feature vector using TF-IDF and similarity
        advanced_features = advanced_feature_engine.build_ml_feature_vector(
            raw_features=raw_features,
            resume_skills=all_skills,
            required_skills=required_skills,
            projects=projects,
            raw_text=raw_text
        )
        
        # Merge with raw features
        engineered = raw_features.copy()
        engineered.update(advanced_features)
        
        # Compute derived features
        engineered['overall_technical_score'] = self._compute_technical_score_advanced(engineered)
        engineered['overall_qualification_score'] = self._compute_qualification_score(engineered)
        engineered['project_strength_score'] = self._compute_project_strength(engineered)
        
        return engineered
    
    def _normalize_skills(self, skills: List[Any]) -> List[str]:
        """Normalize skills to strings."""
        normalized = []
        for skill in skills:
            if isinstance(skill, dict):
                skill_name = skill.get('name', '')
            elif isinstance(skill, str):
                skill_name = skill
            else:
                continue
            if skill_name:
                normalized.append(skill_name.strip())
        return normalized
    
    def _get_role_requirements_simple(self, job_role: Optional[str]) -> Dict[str, Any]:
        """Get simplified role requirements."""
        role_requirements = {
            'FRONTEND_DEVELOPER': {
                'mandatory_skills': ['javascript', 'typescript', 'react', 'html', 'css'],
                'required_domains': ['frontend']
            },
            'BACKEND_DEVELOPER': {
                'mandatory_skills': ['python', 'django', 'sql', 'rest api'],
                'required_domains': ['backend']
            },
            'FULLSTACK_DEVELOPER': {
                'mandatory_skills': ['javascript', 'python', 'react', 'django', 'sql'],
                'required_domains': ['frontend', 'backend']
            },
            'DATA_SCIENTIST': {
                'mandatory_skills': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'required_domains': ['data_science']
            },
            'ML_ENGINEER': {
                'mandatory_skills': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'required_domains': ['ml']
            },
            'DEVOPS_ENGINEER': {
                'mandatory_skills': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'required_domains': ['devops']
            },
        }
        
        if job_role and job_role.upper() in role_requirements:
            return role_requirements[job_role.upper()]
        
        return {'mandatory_skills': [], 'required_domains': []}
    
    def _compute_technical_score_advanced(self, features: Dict) -> float:
        """Compute overall technical score using advanced features."""
        # Use TF-IDF and advanced similarity
        weights = {
            'tfidf_skill_similarity': 0.20,
            'skill_match_ratio': 0.15,
            'skill_depth_score': 0.10,
            'domain_similarity_advanced': 0.15,
            'skill_project_consistency': 0.10,
            'production_tools_usage_score': 0.15,
            'technical_readiness': 0.15,
        }
        
        score = sum(
            features.get(key, 0) * weight 
            for key, weight in weights.items()
        )
        
        return min(score, 1.0)
    
    def _compute_qualification_score(self, features: Dict) -> float:
        """Compute overall qualification score."""
        weights = {
            'degree_level_encoded': 0.30,
            'gpa_normalized': 0.25,
            'university_tier_score': 0.25,
            'coursework_relevance_score': 0.20,
        }
        
        # Normalize degree level
        degree = features.get('degree_level_encoded', 1) / 3
        
        score = (
            degree * weights['degree_level_encoded'] +
            features.get('gpa_normalized', 0) * weights['gpa_normalized'] +
            features.get('university_tier_score', 0) * weights['university_tier_score'] +
            features.get('coursework_relevance_score', 0) * weights['coursework_relevance_score']
        )
        
        return min(score, 1.0)
    
    def _compute_project_strength(self, features: Dict) -> float:
        """Compute project strength score."""
        weights = {
            'project_count': 0.20,
            'project_complexity_score': 0.30,
            'quantified_impact_presence': 0.25,
            'production_tools_usage_score': 0.25,
        }
        
        project_count = min(features.get('project_count', 0) / 5, 1.0)
        
        score = (
            project_count * weights['project_count'] +
            features.get('project_complexity_score', 0) * weights['project_complexity_score'] +
            (1.0 if features.get('quantified_impact_presence') else 0.3) * weights['quantified_impact_presence'] +
            features.get('production_tools_usage_score', 0) * weights['production_tools_usage_score']
        )
        
        return min(score, 1.0)
    
    # =========================================================================
    # PHASE 3-4: ML MODEL INFERENCE
    # =========================================================================
    
    def _run_ml_inference(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phase 3-4: ML Model Inference
        
        Runs ML models to generate predictions using the ML Model Registry.
        Uses XGBoost models for:
        - Suitability Classification
        - Growth Potential Regression
        - Authenticity Detection
        - Communication Score
        - Leadership Score
        """
        
        # Use ML model registry for predictions
        predictions = ml_model_registry.predict_all(features)
        
        # Get suitability probability for decision
        suitability_score = predictions.get('suitability_score', 0.5)
        
        # Determine decision based on thresholds
        predictions['decision'] = suitability_scorer._determine_decision(suitability_score)
        
        # Confidence score (based on model agreement)
        predictions['confidence_score'] = self._compute_ml_confidence(predictions)
        
        # Model Version
        predictions['model_version'] = 'v2.0-xgboost'
        
        # Get red flags from authenticity model
        if predictions.get('resume_authenticity_score', 1.0) < 0.5:
            predictions['red_flags'] = ml_model_registry.get_model('authenticity').get_red_flags(features)
        
        return predictions
    
    def _compute_ml_confidence(self, predictions: Dict[str, float]) -> float:
        """Compute confidence based on model agreement."""
        scores = [
            predictions.get('suitability_score', 0.5),
            predictions.get('growth_potential_score', 0.5),
            predictions.get('resume_authenticity_score', 0.5),
        ]
        
        # Low variance = high confidence
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        confidence = 1.0 - min(variance * 2, 0.5)
        
        return max(0.3, min(confidence, 0.95))
    
    # =========================================================================
    # PHASE 5: BIAS MITIGATION
    # =========================================================================
    
    def _apply_bias_mitigation(
        self,
        features: Dict,
        predictions: Dict
    ) -> Dict[str, Any]:
        """
        Phase 5: Bias Mitigation & Fairness Layer
        
        Applies bias detection and mitigation.
        """
        bias_report = {
            'education_bias_detected': False,
            'normalization_applied': False,
            'fairness_metrics': {}
        }
        
        # 1. Education Bias Detection
        if features.get('university_tier_score', 0) > 0.8:
            bias_report['education_bias_detected'] = True
        
        # 2. Apply normalization if bias detected
        if bias_report['education_bias_detected']:
            # Normalize education score to reduce bias
            education_score = features.get('overall_qualification_score', 0.5)
            normalized_education = 0.5 + (education_score - 0.5) * 0.7
            bias_report['normalization_applied'] = True
            bias_report['normalized_education_score'] = normalized_education
        
        # 3. Compute fairness metrics
        bias_report['fairness_metrics'] = {
            'demographic_parity': self._compute_demographic_parity(predictions),
            'equal_opportunity': self._compute_equal_opportunity(predictions),
        }
        
        return bias_report
    
    def _compute_demographic_parity(self, predictions: Dict) -> float:
        """Compute demographic parity metric."""
        # Simplified: Based on education distribution
        return 0.85  # Placeholder
    
    def _compute_equal_opportunity(self, predictions: Dict) -> float:
        """Compute equal opportunity metric."""
        return 0.80  # Placeholder
    
    # =========================================================================
    # PHASE 6: EXPLAINABILITY
    # =========================================================================
    
    def _generate_explainable_output(
        self,
        user: User,
        features: Dict,
        predictions: Dict,
        bias_report: Dict
    ) -> Dict[str, Any]:
        """
        Phase 6: Explainability & Dashboard Output
        
        Generates final explainable output with feature importance.
        """
        
        # Identify top strengths and gaps
        strengths, gaps = self._identify_strengths_and_gaps(features)
        
        # Get feature importance
        feature_importance = self._compute_feature_importance(features, predictions)
        
        # Build final output
        output = {
            'candidate_id': str(user.id),
            'candidate_email': user.email,
            'suitability_score': round(predictions.get('suitability_score', 0), 2),
            'decision': predictions.get('decision', 'MANUAL_REVIEW'),
            'technical_competency': round(predictions.get('technical_competency_score', 0), 2),
            'growth_potential': round(predictions.get('growth_potential_score', 0), 2),
            'resume_authenticity': round(predictions.get('resume_authenticity_score', 0), 2),
            'communication_score': round(predictions.get('communication_score', 0), 2),
            'leadership_score': round(predictions.get('leadership_score', 0), 2),
            'top_strengths': strengths,
            'skill_gaps': gaps,
            'feature_importance': feature_importance,
            'confidence_score': round(predictions.get('confidence_score', 0), 2),
            'bias_report': bias_report,
        }
        
        return output
    
    def _identify_strengths_and_gaps(
        self,
        features: Dict
    ) -> tuple[List[str], List[str]]:
        """Identify top strengths and skill gaps."""
        strengths = []
        gaps = []
        
        # Check strengths
        if features.get('skill_match_ratio', 0) >= 0.7:
            strengths.append('Strong skill alignment with role requirements')
        if features.get('project_complexity_score', 0) >= 0.7:
            strengths.append('Complex project experience')
        if features.get('production_tools_usage_score', 0) >= 0.7:
            strengths.append('Production environment experience')
        if features.get('internship_relevance_score', 0) >= 0.7:
            strengths.append('Relevant internship experience')
        if features.get('quantified_impact_presence', False):
            strengths.append('Quantified achievements in projects')
        
        # Check gaps
        if features.get('critical_skill_gap_count', 0) > 0:
            gaps.append(f'Missing {features["critical_skill_gap_count"]} critical skills')
        if features.get('skill_match_ratio', 0) < 0.5:
            gaps.append('Low skill match with role requirements')
        if features.get('project_count', 0) < 2:
            gaps.append('Limited project experience')
        if features.get('production_tools_usage_score', 0) < 0.3:
            gaps.append('No production tools experience')
        
        return strengths[:3], gaps[:3]  # Top 3 each
    
    def _compute_feature_importance(
        self,
        features: Dict,
        predictions: Dict
    ) -> Dict[str, float]:
        """Compute feature importance for explainability."""
        
        # Simplified feature importance based on contribution to final score
        importance = {
            'skill_match_ratio': features.get('skill_match_ratio', 0) * 0.20,
            'technical_competency': predictions.get('technical_competency_score', 0) * 0.25,
            'growth_potential': predictions.get('growth_potential_score', 0) * 0.15,
            'project_experience': features.get('project_complexity_score', 0) * 0.15,
            'education_quality': features.get('overall_qualification_score', 0) * 0.15,
            'resume_authenticity': predictions.get('resume_authenticity_score', 0) * 0.10,
        }
        
        return importance
    
    # =========================================================================
    # BATCH ANALYSIS
    # =========================================================================
    
    def analyze_all_interns(self, job_role: Optional[str] = None) -> List[Dict[str, Any]]:
        """Analyze resumes for all interns with resume data."""
        interns = User.objects.filter(
            role=User.Role.INTERN,
            resume_data__isnull=False
        ).select_related('resume_data')
        
        results = []
        
        for intern in interns:
            try:
                result = self.analyze_resume(intern, job_role)
                results.append(result)
            except Exception as e:
                logger.error(f"Error analyzing intern {intern.email}: {str(e)}")
                results.append({
                    'candidate_id': str(intern.id),
                    'candidate_email': intern.email,
                    'error': str(e)
                })
        
        return results


# Singleton instance
talent_intelligence_service = TalentIntelligenceService()
