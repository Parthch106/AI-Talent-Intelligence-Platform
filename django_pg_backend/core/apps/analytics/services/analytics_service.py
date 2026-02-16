"""
Analytics Dashboard Service
Aggregates and computes dashboard metrics.
"""

import logging
from typing import Dict, List, Any, Optional
from collections import Counter
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Q
from django.contrib.auth import get_user_model

from apps.analytics.models import InternIntelligence
from apps.documents.models import ResumeData
from apps.documents.services.feature_engineering import FeatureEngineeringEngine

logger = logging.getLogger(__name__)
User = get_user_model()


class AnalyticsDashboardService:
    """
    Service for computing and aggregating analytics for dashboards.
    """
    
    # Thresholds for risk flags
    RISK_THRESHOLDS = {
        'low_technical': 0.3,
        'low_ai_readiness': 0.3,
        'low_engagement': 0.4,
        'skill_gaps': 3,  # Number of critical skill gaps
    }
    
    def __init__(self):
        self.feature_engine = FeatureEngineeringEngine()
    
    def compute_intern_intelligence(self, user_id: int) -> Dict[str, Any]:
        """
        Compute all intelligence metrics for an intern.
        
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
        logger.info(f"Resume data: {len(data['skills'])} skills, {len(data['experience'])} experience, {len(data['education'])} education, {len(data['projects'])} projects, {len(data['tools'])} tools")
        
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
        
        # Get or create intelligence record
        intelligence, created = InternIntelligence.objects.get_or_create(
            user=user,
            defaults={}
        )
        
        if created:
            logger.info(f"Created new intelligence record for {user.email}")
        else:
            logger.info(f"Updating existing intelligence record for {user.email}")
        
        # Compute features
        try:
            features = self.feature_engine.compute_features(data)
            logger.info(f"Computed features: overall_score={features.get('overall_score', 0)}, skill_diversity={features.get('skill_diversity_score', 0)}")
        except Exception as e:
            logger.error(f"Error computing features for {user.email}: {str(e)}")
            return None
        
        # Compute scores
        intelligence.technical_score = self._compute_technical_score(data, features)
        intelligence.leadership_score = features.get('leadership_indicator', 0.0)
        intelligence.communication_score = self._compute_communication_score(data)
        intelligence.culture_fit_score = self._compute_culture_fit_score(data)
        intelligence.ai_readiness_score = features.get('overall_score', 0.0)
        intelligence.predicted_growth_score = self._compute_growth_score(data, features)
        
        # Store detailed metrics
        intelligence.skill_profile = features.get('skill_categories', {})
        intelligence.domain_strengths = self._get_domain_strengths(features)
        intelligence.skill_gaps = self._identify_skill_gaps(data)
        intelligence.recommendations = self._generate_recommendations(data, features)
        
        # Compute risk flags
        intelligence.risk_flags = self._compute_risk_flags(intelligence)
        
        intelligence.save()
        
        # Phase 2 - Part 1: Compute and store resume features with Phase 2 fields
        try:
            self.compute_resume_features(resume_data.id)
            logger.info(f"Computed resume features for {user.email}")
        except Exception as e:
            logger.error(f"Error computing resume features for {user.email}: {str(e)}")
        
        logger.info(f"Successfully computed intelligence for {user.email}: technical={intelligence.technical_score}, ai_readiness={intelligence.ai_readiness_score}")
        
        return self._serialize_intelligence(intelligence)
    
    def compute_resume_features(self, resume_data_id: int) -> Optional[Dict]:
        """
        Compute feature vectors for a resume.
        
        Args:
            resume_data_id: ID of the ResumeData record
            
        Returns:
            Dictionary containing computed features
        """
        try:
            resume_data = ResumeData.objects.get(id=resume_data_id)
        except ResumeData.DoesNotExist:
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
        
        # Compute base features
        features = self.feature_engine.compute_features(data)
        
        # Phase 2 - Part 1: Compute skill-to-role matching (with 20-25% tolerance)
        role_requirements = self._get_role_requirements(resume_data.applied_role)
        skill_to_role_metrics = self.feature_engine.compute_skill_to_role_match(
            data, role_requirements
        )
        
        # Note: Project & Experience Depth removed from suitability calculation
        
        # Phase 2 - Part 1: Compute resume quality indicators
        resume_quality_metrics = self.feature_engine.compute_resume_quality_indicators(data)
        
        # Phase 2 - Part 1: Compute suitability score (simplified)
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
        
        # Store or update features
        resume_features, created = ResumeFeature.objects.update_or_create(
            resume_data=resume_data,
            defaults={
                # Base features
                'skill_vector': features.get('skill_vector', {}),
                'skill_frequency': features.get('skill_frequency', {}),
                'tfidf_embedding': features.get('tfidf_embedding', {}),
                'skill_categories': features.get('skill_categories', {}),
                'skill_diversity_score': features.get('skill_diversity_score', 0.0),
                'experience_depth_score': features.get('experience_depth_score', 0.0),
                'technical_ratio': features.get('technical_ratio', 0.0),
                'leadership_indicator': features.get('leadership_indicator', 0.0),
                'domain_specialization': features.get('domain_specialization', {}),
                'experience_score': features.get('experience_score', 0.0),
                'education_score': features.get('education_score', 0.0),
                'project_score': features.get('project_score', 0.0),
                'overall_score': features.get('overall_score', 0.0),
                # Phase 2 - Part 1: Skill-to-Role Matching (with tolerance)
                'skill_match_percentage': skill_to_role_metrics.get('skill_match_percentage', 0.0),
                'core_skill_match_score': skill_to_role_metrics.get('core_skill_match_score', 0.0),
                'optional_skill_bonus_score': skill_to_role_metrics.get('optional_skill_bonus_score', 0.0),
                'critical_skill_gap_count': skill_to_role_metrics.get('critical_skill_gap_count', 0),
                'domain_relevance_score': skill_to_role_metrics.get('domain_relevance_score', 0.0),
                # Internship Relevance (used in suitability)
                'internship_relevance_score': resume_quality_metrics.get('internship_relevance_score', 0.5),
                # Resume Quality Indicators
                'resume_authenticity_score': resume_quality_metrics.get('resume_authenticity_score', 0.0),
                'role_alignment_score': resume_quality_metrics.get('role_alignment_score', 0.0),
                'achievement_orientation_score': resume_quality_metrics.get('achievement_orientation_score', 0.0),  # Optional
                'technical_clarity_score': resume_quality_metrics.get('technical_clarity_score', 0.0),
                # Optional: Production Tools Percentage
                'production_tools_percentage': resume_quality_metrics.get('production_tools_percentage', {}),
                # Phase 2 - Part 1: Final Suitability (simplified)
                'suitability_score': suitability_score,
                'decision': decision,
                'decision_flags': decision_flags,
            }
        )
        
        return {
            'id': resume_features.id,
            'overall_score': resume_features.overall_score,
            'skill_diversity_score': resume_features.skill_diversity_score,
            'technical_ratio': resume_features.technical_ratio,
            'suitability_score': resume_features.suitability_score,
            'decision': resume_features.decision,
            'decision_flags': resume_features.decision_flags,
        }
    
    def _get_role_requirements(self, applied_role: str) -> Dict[str, Any]:
        """
        Get role requirements for the applied role.
        
        Args:
            applied_role: The role the candidate is applying for
            
        Returns:
            Dictionary containing role requirements
        """
        # Default role requirements
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
        
        # Use predefined requirements (job_roles table will replace RoleRequirement)
        return self._get_predefined_role_requirements(applied_role)
    
    def _get_predefined_role_requirements(self, role: str) -> Dict[str, Any]:
        """
        Get predefined role requirements for common roles.
        
        Args:
            role: The role name
            
        Returns:
            Dictionary containing predefined role requirements
        """
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
    
    def get_intern_analytics(self, user_id: int) -> Dict[str, Any]:
        """
        Get full analytics for a specific intern.
        
        Args:
            user_id: ID of the intern
            
        Returns:
            Dictionary containing intern analytics
        """
        intelligence = InternIntelligence.objects.filter(user_id=user_id).first()
        if not intelligence:
            return {'message': 'No analytics data available'}
        
        # Get resume data for Phase 2 - Part 1 fields
        from apps.documents.models import ResumeData
        resume_data = ResumeData.objects.filter(user_id=user_id).first()
        
        # Get resume features for Phase 2 - Part 1 analysis
        resume_features = None
        if resume_data:
            resume_features = ResumeFeature.objects.filter(resume_data=resume_data).first()
        
        result = {
            'user_id': user_id,
            'scores': {
                'technical': intelligence.technical_score,
                'leadership': intelligence.leadership_score,
                'communication': intelligence.communication_score,
                'culture_fit': intelligence.culture_fit_score,
                'ai_readiness': intelligence.ai_readiness_score,
                'predicted_growth': intelligence.predicted_growth_score,
            },
            'skill_profile': intelligence.skill_profile,
            'domain_strengths': intelligence.domain_strengths,
            'skill_gaps': intelligence.skill_gaps,
            'recommendations': intelligence.recommendations,
            'risk_flags': intelligence.risk_flags,
        }
        
        # Add Phase 2 - Part 1: Resume Analysis data
        if resume_features:
            result['resume_analysis'] = {
                'applied_role': resume_data.applied_role if resume_data else None,
                'years_of_education': resume_data.years_of_education if resume_data else 0,
                'has_internship_experience': resume_data.has_internship_experience if resume_data else False,
                'internship_count': resume_data.internship_count if resume_data else 0,
                'skill_match_percentage': resume_features.skill_match_percentage,
                'core_skill_match_score': resume_features.core_skill_match_score,
                'optional_skill_bonus_score': resume_features.optional_skill_bonus_score,
                'critical_skill_gap_count': resume_features.critical_skill_gap_count,
                'domain_relevance_score': resume_features.domain_relevance_score,
                'internship_relevance_score': resume_features.internship_relevance_score,
                # Resume Quality Indicators
                'resume_authenticity_score': resume_features.resume_authenticity_score,
                'keyword_stuffing_flag': resume_features.keyword_stuffing_flag,
                'role_alignment_score': resume_features.role_alignment_score,
                'achievement_orientation_score': resume_features.achievement_orientation_score,  # Optional
                'technical_clarity_score': resume_features.technical_clarity_score,
                # Optional: Production Tools Percentage
                'production_tools_percentage': resume_features.production_tools_percentage,
                # Final Suitability
                'suitability_score': resume_features.suitability_score,
                'decision': resume_features.decision,
                'decision_flags': resume_features.decision_flags,
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
        
        # Get intelligence data for interns
        intelligence_qs = InternIntelligence.objects.filter(user__in=interns)
        
        if not intelligence_qs.exists():
            return {
                'total_interns': 0,
                'message': 'No interns in department'
            }
        
        # Compute aggregates
        avg_scores = intelligence_qs.aggregate(
            avg_technical=Avg('technical_score'),
            avg_leadership=Avg('leadership_score'),
            avg_communication=Avg('communication_score'),
            avg_ai_readiness=Avg('ai_readiness_score'),
            avg_growth=Avg('predicted_growth_score'),
        )
        
        # Skill distribution
        all_skills = []
        for intel in intelligence_qs:
            all_skills.extend(intel.skill_profile.keys())
        skill_dist = Counter(all_skills)
        
        # Domain distribution
        domains = {}
        for intel in intelligence_qs:
            domain_data = intel.domain_strengths or {}
            for domain, score in domain_data.items():
                if domain not in domains:
                    domains[domain] = []
                if isinstance(score, dict) and 'domains' in score:
                    for d, s in score['domains'].items():
                        domains[d].append(s)
                else:
                    domains[domain].append(score)
        
        domain_avg = {d: sum(v)/len(v) if v else 0 for d, v in domains.items()}
        
        # High potential interns (AI-readiness > 0.7)
        high_potential = intelligence_qs.filter(
            ai_readiness_score__gte=0.7
        ).count()
        
        # At risk interns
        at_risk = intelligence_qs.filter(
            Q(technical_score__lt=self.RISK_THRESHOLDS['low_technical']) |
            Q(ai_readiness_score__lt=self.RISK_THRESHOLDS['low_ai_readiness'])
        ).count()
        
        return {
            'department': manager.department,
            'total_interns': interns.count(),
            'high_potential_count': high_potential,
            'at_risk_count': at_risk,
            'average_scores': {
                'technical': round(avg_scores['avg_technical'] or 0, 2),
                'leadership': round(avg_scores['avg_leadership'] or 0, 2),
                'communication': round(avg_scores['avg_communication'] or 0, 2),
                'ai_readiness': round(avg_scores['avg_ai_readiness'] or 0, 2),
                'predicted_growth': round(avg_scores['avg_growth'] or 0, 2),
            },
            'skill_distribution': dict(skill_dist.most_common(15)),
            'domain_distribution': {k: round(v, 2) for k, v in domain_avg.items()},
            'risk_factors': self._get_risk_factors(intelligence_qs),
        }
    
    def get_admin_dashboard(self) -> Dict[str, Any]:
        """
        Get admin-level intelligence dashboard.
        
        Returns:
            Dictionary containing platform-wide analytics
        """
        # All interns
        interns = User.objects.filter(role='INTERN')
        intelligence_qs = InternIntelligence.objects.filter(user__in=interns)
        
        if not intelligence_qs.exists():
            return {'message': 'No intern data available'}
        
        # Aggregate metrics
        total_interns = interns.count()
        avg_scores = intelligence_qs.aggregate(
            avg_technical=Avg('technical_score'),
            avg_ai_readiness=Avg('ai_readiness_score'),
            avg_growth=Avg('predicted_growth_score'),
        )
        
        # Pipeline quality
        interns_by_month = interns.filter(
            date_joined__gte=datetime.now() - timedelta(days=180)
        ).values('date_joined__month').annotate(count=Count('id'))
        
        # Skill gap analysis
        all_gaps = []
        for intel in intelligence_qs:
            all_gaps.extend(intel.skill_gaps or [])
        common_gaps = Counter(all_gaps).most_common(10)
        
        # High potential rate
        high_potential_rate = (
            intelligence_qs.filter(ai_readiness_score__gte=0.7).count() / total_interns * 100
        )
        
        # At risk rate
        at_risk_rate = (
            intelligence_qs.filter(
                Q(technical_score__lt=self.RISK_THRESHOLDS['low_technical']) |
                Q(ai_readiness_score__lt=self.RISK_THRESHOLDS['low_ai_readiness'])
            ).count() / total_interns * 100
        )
        
        return {
            'total_interns': total_interns,
            'pipeline_quality': {
                'high_potential_rate': round(high_potential_rate, 1),
                'at_risk_rate': round(at_risk_rate, 1),
                'avg_technical_score': round(avg_scores['avg_technical'] or 0, 2),
                'avg_ai_readiness': round(avg_scores['avg_ai_readiness'] or 0, 2),
                'avg_growth_score': round(avg_scores['avg_growth'] or 0, 2),
            },
            'skill_gap_analysis': [
                {'skill': gap, 'count': count} for gap, count in common_gaps
            ],
            'department_breakdown': self._get_department_breakdown(),
            'conversion_insights': self._get_conversion_insights(),
        }
    
    def _compute_technical_score(self, data: Dict, features: Dict) -> float:
        """Compute technical proficiency score."""
        skill_score = features.get('skill_diversity_score', 0.0) * 0.4
        tech_ratio = features.get('technical_ratio', 0.0) * 0.3
        exp_score = features.get('experience_score', 0.0) * 0.3
        
        return round(skill_score + tech_ratio + exp_score, 4)
    
    def _compute_communication_score(self, data: Dict) -> float:
        """Estimate communication score from available data."""
        # In a real system, this would come from assessments
        # For now, use a default based on completeness
        experience = data.get('experience', [])
        if not experience:
            return 0.5
        
        # Check for communication-related keywords in experience
        comm_keywords = ['communication', 'presentation', 'client', 'team', 'collaboration']
        for exp in experience:
            desc = (exp.get('description', '') + ' ' + exp.get('title', '')).lower()
            if any(kw in desc for kw in comm_keywords):
                return 0.7
        
        return 0.5
    
    def _compute_culture_fit_score(self, data: Dict) -> float:
        """Estimate culture fit score."""
        # Placeholder - would use assessment data in real system
        return 0.6
    
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
    
    def _get_domain_strengths(self, features: Dict) -> List[str]:
        """Get list of domain strengths."""
        domain_specialization = features.get('domain_specialization', {})
        
        # Check if domains is a dictionary
        if isinstance(domain_specialization, dict):
            domains = domain_specialization.get('domains', {})
        else:
            domains = {}
        
        if not domains:
            # If no domains found, check skill categories for strengths
            skill_categories = features.get('skill_categories', {})
            if skill_categories:
                # Return categories with at least 2 skills
                return [cat for cat, count in skill_categories.items() if count >= 2]
            return []
        
        # Return domains with score > 0.3 (lowered threshold)
        strengths = [d for d, s in domains.items() if s > 0.3]
        
        # If still empty, return the top domain
        if not strengths and domains:
            top_domain = max(domains.items(), key=lambda x: x[1])
            if top_domain[1] > 0:
                return [top_domain[0]]
        
        return strengths
    
    def _identify_skill_gaps(self, data: Dict) -> List[str]:
        """Identify missing skills based on role expectations."""
        skills = set()
        
        # Handle different skill formats
        for skill in data.get('skills', []):
            if isinstance(skill, dict):
                # Skill is a dictionary with 'name' field
                skill_name = skill.get('name', '').lower()
            elif isinstance(skill, str):
                # Skill is a string
                skill_name = skill.lower()
            else:
                continue
            
            if skill_name:
                skills.add(skill_name)
        
        # Also check tools
        for tool in data.get('tools', []):
            if isinstance(tool, dict):
                tool_name = tool.get('name', '').lower()
            elif isinstance(tool, str):
                tool_name = tool.lower()
            else:
                continue
            
            if tool_name:
                skills.add(tool_name)
        
        # Critical skills for tech roles
        critical_skills = [
            'python', 'git', 'sql', 'rest api', 'docker', 'javascript',
            'react', 'django', 'flask', 'node.js', 'aws', 'kubernetes'
        ]
        
        gaps = [s for s in critical_skills if s not in skills]
        return gaps[:5]  # Return top 5 gaps
    
    def _generate_recommendations(self, data: Dict, features: Dict) -> List[str]:
        """Generate personalized recommendations."""
        recommendations = []
        
        # Skill gap recommendations
        gaps = self._identify_skill_gaps(data)
        if gaps:
            recommendations.append(f"Consider learning: {', '.join(gaps[:3])}")
        
        # Experience recommendations
        total_exp = data.get('total_experience_years', 0)
        if total_exp < 1:
            recommendations.append("Look for more project-based experience opportunities")
        
        # Technical ratio recommendations
        if features.get('technical_ratio', 0) < 0.5:
            recommendations.append("Focus on deepening technical skills in your domain")
        
        return recommendations
    
    def _compute_risk_flags(self, intelligence: InternIntelligence) -> List[Dict]:
        """Compute risk flags for an intern."""
        flags = []
        
        if intelligence.technical_score < self.RISK_THRESHOLDS['low_technical']:
            flags.append({
                'type': 'low_technical',
                'severity': 'high',
                'message': 'Technical skills below threshold'
            })
        
        if intelligence.ai_readiness_score < self.RISK_THRESHOLDS['low_ai_readiness']:
            flags.append({
                'type': 'low_ai_readiness',
                'severity': 'medium',
                'message': 'AI readiness could be improved'
            })
        
        gaps = intelligence.skill_gaps or []
        if len(gaps) >= self.RISK_THRESHOLDS['skill_gaps']:
            flags.append({
                'type': 'skill_gaps',
                'severity': 'medium',
                'message': f'Multiple skill gaps identified ({len(gaps)})'
            })
        
        return flags
    
    def _get_risk_factors(self, intelligence_qs) -> Dict[str, int]:
        """Get count of interns by risk factor."""
        risk_counts = {
            'low_technical': 0,
            'low_ai_readiness': 0,
            'skill_gaps': 0,
        }
        
        for intel in intelligence_qs:
            for flag in intel.risk_flags or []:
                if flag.get('type') in risk_counts:
                    risk_counts[flag['type']] += 1
        
        return risk_counts
    
    def _get_department_breakdown(self) -> List[Dict]:
        """Get breakdown by department."""
        from apps.accounts.models import User
        
        breakdown = []
        for dept in User.objects.values_list('department', flat=True).distinct():
            if dept:
                interns = User.objects.filter(role='INTERN', department=dept)
                intelligence_qs = InternIntelligence.objects.filter(user__in=interns)
                
                breakdown.append({
                    'department': dept,
                    'count': interns.count(),
                    'avg_ai_readiness': intelligence_qs.aggregate(
                        avg=Avg('ai_readiness_score')
                    )['avg'] or 0,
                })
        
        return breakdown
    
    def _get_conversion_insights(self) -> Dict:
        """Get insights for internship-to-offer conversion."""
        # Placeholder - would use actual conversion data
        return {
            'historical_conversion_rate': 0.65,
            'factors': [
                'Technical proficiency above 0.7 correlates with 80% conversion',
                'Active AI-readiness engagement increases conversion by 25%',
                'Leadership indicators show positive correlation with offers',
            ]
        }
    
    def _serialize_intelligence(self, intelligence: InternIntelligence) -> Dict:
        """Serialize intelligence model to dictionary."""
        return {
            'user_id': intelligence.user_id,
            'scores': {
                'technical': intelligence.technical_score,
                'leadership': intelligence.leadership_score,
                'communication': intelligence.communication_score,
                'culture_fit': intelligence.culture_fit_score,
                'ai_readiness': intelligence.ai_readiness_score,
                'predicted_growth': intelligence.predicted_growth_score,
            },
            'skill_profile': intelligence.skill_profile,
            'domain_strengths': intelligence.domain_strengths,
            'skill_gaps': intelligence.skill_gaps,
            'recommendations': intelligence.recommendations,
            'risk_flags': intelligence.risk_flags,
            'calculated_at': intelligence.calculated_at.isoformat() if intelligence.calculated_at else None,
        }
