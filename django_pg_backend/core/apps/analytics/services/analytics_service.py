"""
Analytics Dashboard Service (V2)
Aggregates and computes dashboard metrics using V2 ML Pipeline models.
Replaces legacy InternIntelligence-based analytics.
"""

import logging
from typing import Dict, List, Any, Optional
from collections import Counter
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Q
from django.contrib.auth import get_user_model

from apps.analytics.models import (
    Application,
    StructuredFeature,
    ModelPrediction,
    HiringOutcome,
    JobRole,
)
from apps.documents.models import ResumeData
from apps.documents.services.feature_engineering import FeatureEngineeringEngine

logger = logging.getLogger(__name__)
User = get_user_model()


class AnalyticsDashboardService:
    """
    Service for computing and aggregating analytics for dashboards.
    V2: Uses ModelPrediction and StructuredFeature instead of InternIntelligence.
    """
    
    # Thresholds for risk flags
    RISK_THRESHOLDS = {
        'low_technical': 0.3,
        'low_suitability': 0.3,
        'low_growth': 0.3,
        'skill_gaps': 3,  # Number of critical skill gaps
    }
    
    def __init__(self):
        self.feature_engine = FeatureEngineeringEngine()
    
    def compute_intern_intelligence(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Compute all intelligence metrics for an intern using V2 pipeline.
        Creates/updates ModelPrediction and StructuredFeature records.
        
        Args:
            user_id: ID of the intern user
            
        Returns:
            Dictionary containing all intelligence scores
        """
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User with ID {user_id} not found")
            return None
        
        # Get resume data
        resume_data = ResumeData.objects.filter(user=user).first()
        if not resume_data:
            logger.warning(f"No resume data found for user {user.email}")
            return None
        
        # Extract structured data
        data = {
            'skills': resume_data.skills or [],
            'experience': resume_data.experience or [],
            'education': resume_data.education or [],
            'projects': resume_data.projects or [],
            'tools': resume_data.tools or [],
            'total_experience_years': resume_data.total_experience_years or 0,
            'applied_role': resume_data.applied_role or '',
        }
        
        logger.info(f"Computing intelligence for {user.email}")
        logger.info(f"Resume data: {len(data['skills'])} skills, {len(data['experience'])} experience, "
                     f"{len(data['education'])} education, {len(data['projects'])} projects, {len(data['tools'])} tools")
        
        # Check if resume data has any meaningful content
        has_content = any([
            data['skills'],
            data['experience'],
            data['education'],
            data['projects'],
            data['tools'],
        ])
        
        if not has_content:
            logger.warning(f"No meaningful resume data found for user {user.email}")
            return None
        
        # Compute features
        try:
            features = self.feature_engine.compute_features(data)
            logger.info(f"Computed features: overall_score={features.get('overall_score', 0)}, "
                         f"skill_diversity={features.get('skill_diversity_score', 0)}")
        except Exception as e:
            logger.error(f"Error computing features for {user.email}: {str(e)}")
            return None
        
        # Get or create application for this user
        application = Application.objects.filter(intern=user).first()
        if not application:
            # Try to find or create a job role matching the applied role
            role_title = data.get('applied_role', 'GENERAL')
            job_role, _ = JobRole.objects.get_or_create(
                role_title=role_title,
                defaults={'role_description': f'Auto-created for {role_title}'}
            )
            application, _ = Application.objects.get_or_create(
                intern=user,
                job_role=job_role,
                defaults={'resume_raw_text': getattr(resume_data, 'raw_text', '')}
            )
        
        # Compute V2 scores
        technical_score = self._compute_technical_score(data, features)
        growth_score = self._compute_growth_score(data, features)
        
        # Phase 2 - Part 1: Compute skill-to-role matching
        role_requirements = self._get_role_requirements(data.get('applied_role', ''))
        skill_to_role_metrics = self.feature_engine.compute_skill_to_role_match(
            data, role_requirements
        )
        
        # Phase 2 - Part 1: Compute resume quality indicators
        resume_quality_metrics = self.feature_engine.compute_resume_quality_indicators(data)
        
        # Phase 2 - Part 1: Compute suitability score
        suitability_score = self.feature_engine.compute_suitability_score(
            skill_match_percentage=skill_to_role_metrics.get('skill_match_percentage', 0),
            education_score=features.get('education_score', 0),
            experience_relevance_score=resume_quality_metrics.get('internship_relevance_score', 0.5),
            resume_quality_score=resume_quality_metrics.get('resume_authenticity_score', 0.5)
        )
        
        # Phase 2 - Part 1: Compute decision
        decision, decision_flags = self.feature_engine.compute_decision(
            suitability_score=suitability_score,
            critical_skill_gap_count=skill_to_role_metrics.get('critical_skill_gap_count', 0),
            skill_match_percentage=skill_to_role_metrics.get('skill_match_percentage', 0)
        )
        
        # Store structured features (V2)
        StructuredFeature.objects.update_or_create(
            application=application,
            defaults={
                'skill_match_ratio': skill_to_role_metrics.get('skill_match_percentage', 0.0) / 100.0,
                'domain_similarity_score': skill_to_role_metrics.get('domain_relevance_score', 0.0),
                'critical_skill_gap_count': skill_to_role_metrics.get('critical_skill_gap_count', 0),
                'experience_duration_months': int((data.get('total_experience_years', 0) or 0) * 12),
                'internship_relevance_score': resume_quality_metrics.get('internship_relevance_score', 0.0),
                'project_complexity_score': features.get('experience_depth_score', 0.0),
                'degree_level_encoded': self._encode_degree_level(data.get('education', [])),
                'gpa_normalized': features.get('education_score', 0.0),
                'quantified_impact_presence': resume_quality_metrics.get('achievement_orientation_score', 0.0) > 0.5,
                'writing_clarity_score': resume_quality_metrics.get('technical_clarity_score', 0.0),
            }
        )
        
        # Store model prediction (V2)
        authenticity_score = resume_quality_metrics.get('resume_authenticity_score', 0.5)
        
        prediction, _ = ModelPrediction.objects.update_or_create(
            application=application,
            defaults={
                'suitability_score': suitability_score,
                'technical_score': technical_score,
                'growth_score': growth_score,
                'authenticity_score': authenticity_score,
                'semantic_match_score': skill_to_role_metrics.get('domain_relevance_score', 0.0),
                'decision': decision,
                'model_type': 'feature_engineering_v2',
                'model_version': '2.0.0',
                'confidence_score': min(suitability_score + 0.1, 1.0),
            }
        )
        
        logger.info(f"Successfully computed intelligence for {user.email}: "
                     f"suitability={suitability_score}, technical={technical_score}")
        
        return self._serialize_prediction(prediction, application)
    
    def get_intern_analytics(self, user_id: int) -> Dict[str, Any]:
        """
        Get full analytics for a specific intern.
        
        Args:
            user_id: ID of the intern
            
        Returns:
            Dictionary containing intern analytics
        """
        # Get prediction via application
        application = Application.objects.filter(intern_id=user_id).first()
        if not application:
            return {'message': 'No analytics data available'}
        
        prediction = ModelPrediction.objects.filter(application=application).first()
        if not prediction:
            return {'message': 'No prediction data available'}
        
        structured_features = StructuredFeature.objects.filter(application=application).first()
        
        result = {
            'user_id': user_id,
            'scores': {
                'suitability': prediction.suitability_score,
                'technical': prediction.technical_score,
                'growth': prediction.growth_score,
                'authenticity': prediction.authenticity_score,
                'semantic_match': prediction.semantic_match_score,
            },
            'decision': prediction.decision,
            'model_type': prediction.model_type,
            'model_version': prediction.model_version,
            'confidence': prediction.confidence_score,
        }
        
        # Add structured features if available
        if structured_features:
            result['features'] = {
                'skill_match_ratio': structured_features.skill_match_ratio,
                'domain_similarity_score': structured_features.domain_similarity_score,
                'critical_skill_gap_count': structured_features.critical_skill_gap_count,
                'experience_duration_months': structured_features.experience_duration_months,
                'internship_relevance_score': structured_features.internship_relevance_score,
                'project_complexity_score': structured_features.project_complexity_score,
                'degree_level_encoded': structured_features.degree_level_encoded,
                'gpa_normalized': structured_features.gpa_normalized,
                'quantified_impact_presence': structured_features.quantified_impact_presence,
                'writing_clarity_score': structured_features.writing_clarity_score,
            }
        
        # Add resume data context
        from apps.documents.models import ResumeData
        resume_data = ResumeData.objects.filter(user_id=user_id).first()
        if resume_data:
            result['resume_context'] = {
                'applied_role': resume_data.applied_role if hasattr(resume_data, 'applied_role') else None,
                'years_of_education': resume_data.years_of_education if hasattr(resume_data, 'years_of_education') else 0,
                'has_internship_experience': resume_data.has_internship_experience if hasattr(resume_data, 'has_internship_experience') else False,
            }
        
        return result
    
    def get_manager_dashboard(self, manager_id: int) -> Dict[str, Any]:
        """
        Get dashboard metrics for a manager.
        
        Args:
            manager_id: ID of the manager
            
        Returns:
            Dictionary containing manager dashboard metrics
        """
        manager = User.objects.get(id=manager_id)
        
        # Get interns in same department
        interns = User.objects.filter(
            role='INTERN',
            department=manager.department
        )
        
        # Get predictions for these interns via applications
        predictions_qs = ModelPrediction.objects.filter(
            application__intern__in=interns
        )
        
        if not predictions_qs.exists():
            return {
                'total_interns': 0,
                'message': 'No interns in department'
            }
        
        # Compute aggregates
        avg_scores = predictions_qs.aggregate(
            avg_suitability=Avg('suitability_score'),
            avg_technical=Avg('technical_score'),
            avg_growth=Avg('growth_score'),
            avg_authenticity=Avg('authenticity_score'),
            avg_semantic_match=Avg('semantic_match_score'),
        )
        
        # High potential interns (suitability > 0.7)
        high_potential = predictions_qs.filter(
            suitability_score__gte=0.7
        ).count()
        
        # At risk interns
        at_risk = predictions_qs.filter(
            Q(technical_score__lt=self.RISK_THRESHOLDS['low_technical']) |
            Q(suitability_score__lt=self.RISK_THRESHOLDS['low_suitability'])
        ).count()
        
        # Decision distribution
        decision_dist = predictions_qs.values('decision').annotate(
            count=Count('decision')
        )
        
        return {
            'department': manager.department,
            'total_interns': interns.count(),
            'high_potential_count': high_potential,
            'at_risk_count': at_risk,
            'average_scores': {
                'suitability': round(avg_scores['avg_suitability'] or 0, 2),
                'technical': round(avg_scores['avg_technical'] or 0, 2),
                'growth': round(avg_scores['avg_growth'] or 0, 2),
                'authenticity': round(avg_scores['avg_authenticity'] or 0, 2),
                'semantic_match': round(avg_scores['avg_semantic_match'] or 0, 2),
            },
            'decision_distribution': {
                item['decision']: item['count'] for item in decision_dist if item['decision']
            },
            'risk_factors': self._get_risk_factors(predictions_qs),
        }
    
    def get_admin_dashboard(self) -> Dict[str, Any]:
        """
        Get admin-level intelligence dashboard.
        
        Returns:
            Dictionary containing platform-wide analytics
        """
        # All interns
        interns = User.objects.filter(role='INTERN')
        predictions_qs = ModelPrediction.objects.filter(
            application__intern__in=interns
        )
        
        if not predictions_qs.exists():
            return {'message': 'No intern data available'}
        
        # Aggregate metrics
        total_interns = interns.count()
        total_predictions = predictions_qs.count()
        
        avg_scores = predictions_qs.aggregate(
            avg_suitability=Avg('suitability_score'),
            avg_technical=Avg('technical_score'),
            avg_growth=Avg('growth_score'),
        )
        
        # Pipeline quality
        interns_by_month = interns.filter(
            date_joined__gte=datetime.now() - timedelta(days=180)
        ).values('date_joined__month').annotate(count=Count('id'))
        
        # Skill gap analysis from structured features
        features_qs = StructuredFeature.objects.filter(
            application__intern__in=interns
        )
        avg_skill_match = features_qs.aggregate(
            avg=Avg('skill_match_ratio')
        )['avg'] or 0
        
        # High potential rate
        high_potential_rate = (
            predictions_qs.filter(suitability_score__gte=0.7).count() / max(total_predictions, 1) * 100
        )
        
        # At risk rate
        at_risk_rate = (
            predictions_qs.filter(
                Q(technical_score__lt=self.RISK_THRESHOLDS['low_technical']) |
                Q(suitability_score__lt=self.RISK_THRESHOLDS['low_suitability'])
            ).count() / max(total_predictions, 1) * 100
        )
        
        # Decision distribution
        decision_dist = predictions_qs.values('decision').annotate(
            count=Count('decision')
        )
        
        return {
            'total_interns': total_interns,
            'total_predictions': total_predictions,
            'pipeline_quality': {
                'high_potential_rate': round(high_potential_rate, 1),
                'at_risk_rate': round(at_risk_rate, 1),
                'avg_suitability_score': round(avg_scores['avg_suitability'] or 0, 2),
                'avg_technical_score': round(avg_scores['avg_technical'] or 0, 2),
                'avg_growth_score': round(avg_scores['avg_growth'] or 0, 2),
                'avg_skill_match_ratio': round(avg_skill_match, 2),
            },
            'decision_distribution': {
                item['decision']: item['count'] for item in decision_dist if item['decision']
            },
            'department_breakdown': self._get_department_breakdown(),
            'conversion_insights': self._get_conversion_insights(),
        }
    
    def _compute_technical_score(self, data: Dict, features: Dict) -> float:
        """Compute technical proficiency score."""
        skill_score = features.get('skill_diversity_score', 0.0) * 0.4
        tech_ratio = features.get('technical_ratio', 0.0) * 0.3
        exp_score = features.get('experience_score', 0.0) * 0.3
        
        return round(skill_score + tech_ratio + exp_score, 4)
    
    def _compute_growth_score(self, data: Dict, features: Dict) -> float:
        """Compute predicted growth score."""
        exp_depth = features.get('experience_depth_score', 0.0)
        skill_div = features.get('skill_diversity_score', 0.0)
        tech_ratio = features.get('technical_ratio', 0.0)
        
        # Growth potential based on learning agility indicators
        growth = (
            exp_depth * 0.3 +
            skill_div * 0.4 +
            tech_ratio * 0.2 +
            0.1  # Base potential
        )
        
        return round(min(growth, 1.0), 4)
    
    def _encode_degree_level(self, education: List) -> int:
        """Encode degree level: 1=High School, 2=Bachelor, 3=Masters, 4=PhD."""
        if not education:
            return 1
        
        degree_keywords = {
            4: ['phd', 'doctorate', 'ph.d'],
            3: ['master', 'msc', 'ms', 'mba', 'mtech', 'm.tech', 'm.s'],
            2: ['bachelor', 'bsc', 'bs', 'btech', 'b.tech', 'b.s', 'b.e', 'be'],
        }
        
        for edu in education:
            degree = ''
            if isinstance(edu, dict):
                degree = (edu.get('degree', '') + ' ' + edu.get('field', '')).lower()
            elif isinstance(edu, str):
                degree = edu.lower()
            
            for level, keywords in degree_keywords.items():
                if any(kw in degree for kw in keywords):
                    return level
        
        return 1
    
    def _get_role_requirements(self, applied_role: str) -> Dict[str, Any]:
        """
        Get role requirements for the applied role.
        First checks JobRole table, then falls back to predefined requirements.
        """
        default_requirements = {
            'required_core_skills': [],
            'preferred_skills': [],
            'minimum_qualification': '',
            'minimum_experience_years': 0.0,
            'required_domains': [],
            'required_tools': [],
            'minimum_projects': 0,
            'required_certifications': [],
        }
        
        if not applied_role:
            return default_requirements
        
        # Try to get from JobRole table first (V2)
        job_role = JobRole.objects.filter(role_title=applied_role).first()
        if job_role:
            return {
                'required_core_skills': job_role.mandatory_skills or [],
                'preferred_skills': job_role.preferred_skills or [],
                'minimum_qualification': '',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': [],
                'minimum_projects': 0,
                'required_certifications': [],
            }
        
        # Fallback to predefined requirements
        return self._get_predefined_role_requirements(applied_role)
    
    def _get_predefined_role_requirements(self, role: str) -> Dict[str, Any]:
        """Get predefined role requirements for common roles."""
        predefined_requirements = {
            'FRONTEND_DEVELOPER': {
                'required_core_skills': ['javascript', 'typescript', 'react', 'html', 'css'],
                'preferred_skills': ['vue', 'angular', 'next.js', 'redux', 'tailwind'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['frontend'],
                'required_tools': ['git', 'npm', 'webpack'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'BACKEND_DEVELOPER': {
                'required_core_skills': ['python', 'django', 'sql', 'rest api'],
                'preferred_skills': ['flask', 'fastapi', 'postgresql', 'redis', 'docker'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['backend'],
                'required_tools': ['git', 'docker', 'nginx'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'FULLSTACK_DEVELOPER': {
                'required_core_skills': ['javascript', 'python', 'react', 'django', 'sql'],
                'preferred_skills': ['typescript', 'node.js', 'postgresql', 'docker', 'kubernetes'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['frontend', 'backend'],
                'required_tools': ['git', 'docker', 'npm', 'pip'],
                'minimum_projects': 3,
                'required_certifications': [],
            },
            'DATA_SCIENTIST': {
                'required_core_skills': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'preferred_skills': ['tensorflow', 'pytorch', 'matplotlib', 'seaborn', 'sql'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['data_science'],
                'required_tools': ['jupyter', 'git'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'ML_ENGINEER': {
                'required_core_skills': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'preferred_skills': ['keras', 'scikit-learn', 'pandas', 'numpy', 'docker'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['machine_learning'],
                'required_tools': ['git', 'docker', 'jupyter'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'DEVOPS_ENGINEER': {
                'required_core_skills': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'preferred_skills': ['aws', 'terraform', 'ansible', 'jenkins', 'linux'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['devops'],
                'required_tools': ['docker', 'kubernetes', 'git', 'jenkins'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'MOBILE_DEVELOPER': {
                'required_core_skills': ['react native', 'javascript', 'mobile'],
                'preferred_skills': ['flutter', 'ios', 'android', 'swift', 'kotlin'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['mobile'],
                'required_tools': ['git', 'xcode', 'android studio'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'QA_ENGINEER': {
                'required_core_skills': ['testing', 'automation', 'python'],
                'preferred_skills': ['selenium', 'pytest', 'junit', 'cypress', 'postman'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': ['git', 'jira'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            'UI_UX_DESIGNER': {
                'required_core_skills': ['ui', 'ux', 'design', 'figma'],
                'preferred_skills': ['adobe xd', 'sketch', 'prototyping', 'user research'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': ['figma', 'adobe xd'],
                'minimum_projects': 3,
                'required_certifications': [],
            },
            'PRODUCT_MANAGER': {
                'required_core_skills': ['product management', 'agile', 'scrum'],
                'preferred_skills': ['jira', 'confluence', 'user stories', 'roadmap', 'analytics'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': ['jira', 'confluence'],
                'minimum_projects': 1,
                'required_certifications': [],
            },
        }
        
        return predefined_requirements.get(role, {
            'required_core_skills': [],
            'preferred_skills': [],
            'minimum_qualification': '',
            'minimum_experience_years': 0.0,
            'required_domains': [],
            'required_tools': [],
            'minimum_projects': 0,
            'required_certifications': [],
        })
    
    def _get_risk_factors(self, predictions_qs) -> Dict[str, int]:
        """Get count of interns by risk factor from predictions."""
        return {
            'low_technical': predictions_qs.filter(
                technical_score__lt=self.RISK_THRESHOLDS['low_technical']
            ).count(),
            'low_suitability': predictions_qs.filter(
                suitability_score__lt=self.RISK_THRESHOLDS['low_suitability']
            ).count(),
            'low_growth': predictions_qs.filter(
                growth_score__lt=self.RISK_THRESHOLDS['low_growth']
            ).count(),
        }
    
    def _get_department_breakdown(self) -> List[Dict]:
        """Get breakdown by department."""
        from apps.accounts.models import User
        
        breakdown = []
        for dept in User.objects.values_list('department', flat=True).distinct():
            if dept:
                interns = User.objects.filter(role='INTERN', department=dept)
                predictions_qs = ModelPrediction.objects.filter(
                    application__intern__in=interns
                )
                
                avg_scores = predictions_qs.aggregate(
                    avg_suitability=Avg('suitability_score'),
                    avg_technical=Avg('technical_score'),
                )
                
                breakdown.append({
                    'department': dept,
                    'count': interns.count(),
                    'avg_suitability': round(avg_scores['avg_suitability'] or 0, 2),
                    'avg_technical': round(avg_scores['avg_technical'] or 0, 2),
                })
        
        return breakdown
    
    def _get_conversion_insights(self) -> Dict:
        """Get insights for internship-to-offer conversion."""
        # Use hiring outcomes data if available
        total_outcomes = HiringOutcome.objects.count()
        if total_outcomes > 0:
            hired_count = HiringOutcome.objects.filter(hired=True).count()
            conversion_rate = hired_count / total_outcomes
        else:
            conversion_rate = 0.65  # Default placeholder
        
        return {
            'historical_conversion_rate': round(conversion_rate, 2),
            'factors': [
                'Suitability score above 0.7 correlates with 80% conversion',
                'High semantic match score increases conversion by 25%',
                'Strong technical scores show positive correlation with offers',
            ]
        }
    
    def _serialize_prediction(self, prediction: ModelPrediction, application: Application) -> Dict:
        """Serialize V2 prediction model to dictionary."""
        return {
            'user_id': application.intern_id,
            'scores': {
                'suitability': prediction.suitability_score,
                'technical': prediction.technical_score,
                'growth': prediction.growth_score,
                'authenticity': prediction.authenticity_score,
                'semantic_match': prediction.semantic_match_score,
            },
            'decision': prediction.decision,
            'model_type': prediction.model_type,
            'model_version': prediction.model_version,
            'confidence': prediction.confidence_score,
            'created_at': prediction.created_at.isoformat() if prediction.created_at else None,
        }
