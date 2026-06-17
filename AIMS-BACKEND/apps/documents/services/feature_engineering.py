import re
from typing import Dict, List, Optional, Any
from collections import Counter
import numpy as np

from .config import (
    SKILL_CATEGORIES, LEADERSHIP_KEYWORDS, TECHNICAL_KEYWORDS, 
    SKILL_IDF_WEIGHTS, DOMAIN_KEYWORDS, OVERALL_SCORE_WEIGHTS
)
from .normalization import NormalizationService
from .scoring import ScoringService
from .analysis import AnalysisService

class FeatureEngineeringEngine:
    """
    Transforms structured resume data into AI-ready features.
    Delegates to specialized services for normalization, scoring, and analysis.
    """
    
    # Pre-compile patterns for efficiency at the class level
    _all_skills = [skill for skills in SKILL_CATEGORIES.values() for skill in skills]
    _skill_pattern = re.compile(r'\b(' + '|'.join(map(re.escape, _all_skills)) + r')\b', re.IGNORECASE)
    
    def __init__(self):
        """Initialize the feature engineering engine."""
        pass
    
    def compute_features(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute all features from resume data."""
        features = {}
        
        # Extract and normalize data
        skills = NormalizationService.normalize_skills(resume_data.get('skills', []))
        experience = resume_data.get('experience', [])
        education = resume_data.get('education', [])
        projects = resume_data.get('projects', [])
        tools = NormalizationService.normalize_skills(resume_data.get('tools', []))
        total_exp = resume_data.get('total_experience_years', 0)
        
        # 1. Skill Vectorization & Frequency
        features['skill_vector'] = NormalizationService.compute_skill_vector(skills)
        features['skill_frequency'] = NormalizationService.compute_skill_frequency(skills)
        features['tfidf_embedding'] = NormalizationService.compute_tfidf_embedding(skills)
        
        # 2. Category Analysis
        skills_lower = [s.lower() for s in skills]
        features['skill_categories'] = {
            cat: sum(1 for s in skills_lower if s in cat_skills)
            for cat, cat_skills in SKILL_CATEGORIES.items()
        }
        
        # 3. Derived Metrics
        features['skill_diversity_score'] = ScoringService.compute_skill_diversity(skills)
        features['experience_depth_score'] = ScoringService.compute_experience_depth(experience, total_exp)
        features['technical_ratio'] = ScoringService.compute_technical_ratio(skills, tools)
        features['leadership_indicator'] = ScoringService.compute_leadership_indicator(experience)
        features['domain_specialization'] = self._compute_domain_specialization(skills, experience)
        
        # 4. Component Scores
        features['experience_score'] = self._compute_experience_score(experience, total_exp)
        features['education_score'] = self._compute_education_score(education)
        features['project_score'] = self._compute_project_score(projects, skills)
        
        # 5. Overall Score
        features['overall_score'] = ScoringService.compute_overall_score(features)
        
        return features

    def compute_skill_to_role_match(self, resume_data: Dict[str, Any], role_reqs: Dict[str, Any]) -> Dict[str, Any]:
        """Compute skill-to-role matching metrics."""
        skills = NormalizationService.normalize_skills(resume_data.get('skills', []))
        tools = NormalizationService.normalize_skills(resume_data.get('tools', []))
        return AnalysisService.compute_skill_to_role_match(
            skills, tools, role_reqs, 
            resume_data.get('experience', []), 
            resume_data.get('projects', [])
        )

    def compute_project_experience_depth(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute project and experience depth evaluation metrics."""
        projects = resume_data.get('projects', [])
        experience = resume_data.get('experience', [])
        skills = NormalizationService.normalize_skills(resume_data.get('skills', []))
        tools = NormalizationService.normalize_skills(resume_data.get('tools', []))
        
        return {
            'practical_exposure_score': round(self._compute_practical_exposure_score(projects, experience, skills, tools), 4),
            'problem_solving_depth_score': round(self._compute_problem_solving_depth_score(projects, experience), 4),
            'project_complexity_score': round(self._compute_project_complexity_score(projects), 4),
            'production_tools_usage_score': round(self._compute_production_tools_usage_score(projects, experience, tools), 4),
            'internship_relevance_score': round(self._compute_internship_relevance_score(experience, skills), 4),
        }

    def compute_resume_quality_indicators(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute resume quality indicators."""
        skills = resume_data.get('skills', [])
        experience = resume_data.get('experience', [])
        projects = resume_data.get('projects', [])
        
        return {
            'resume_authenticity_score': round(self._compute_resume_authenticity_score(skills, experience, projects), 4),
            'role_alignment_score': round(self._compute_role_alignment_score(resume_data), 4),
            'technical_clarity_score': round(self._compute_technical_clarity_score(skills, experience, projects), 4),
            'achievement_orientation_score': round(self._compute_achievement_orientation_score(experience, projects), 4),
            'keyword_stuffing_flag': self._detect_keyword_stuffing(skills),
            'production_tools_percentage': self._compute_production_tools_percentage(skills, tools=resume_data.get('tools', [])),
        }

    def compute_suitability_score(self, skill_match_pct: float, edu_score: float, exp_rel_score: float = 0.5, quality_score: float = 0.5) -> float:
        """Compute final suitability score (0-100)."""
        weighted = (skill_match_pct/100 * 0.50 + edu_score * 0.25 + exp_rel_score * 0.15 + quality_score * 0.10)
        return round(weighted * 100, 2)

    def compute_decision(self, score: float, gap_count: int, match_pct: float) -> tuple:
        """Compute suitability decision and flags."""
        flags = []
        if score >= 80:
            decision = 'INTERVIEW_SHORTLIST'
            if match_pct >= 90: flags.append('High technical fit')
            if gap_count == 0: flags.append('Strong skill coverage')
        elif score >= 60:
            decision = 'MANUAL_REVIEW'
            if gap_count > 0: flags.append(f'Missing {gap_count} critical skill(s)')
            if match_pct >= 70: flags.append('Good technical foundation')
        else:
            decision = 'REJECT'
            if gap_count >= 3: flags.append('Missing critical backend fundamentals')
            if match_pct < 40: flags.append('Underqualified')
        
        if score >= 95: flags.append('Overqualified')
        return decision, flags

    # Internal helper methods
    
    def _compute_domain_specialization(self, skills: List[str], experience: List[Dict]) -> Dict[str, Any]:
        skills_lower = [s.lower() for s in skills]
        specs = {cat: min(sum(1 for s in skills_lower if s in cat_skills) / 5, 1.0) for cat, cat_skills in SKILL_CATEGORIES.items()}
        domains = {d: 0.0 for d in DOMAIN_KEYWORDS.keys()}
        for exp in experience:
            txt = (exp.get('title', '') + ' ' + exp.get('description', '')).lower()
            for d, kws in DOMAIN_KEYWORDS.items():
                if any(kw in txt for kw in kws): domains[d] += 0.3
        specs['domains'] = {d: min(v, 1.0) for d, v in domains.items()}
        specs['primary_domain'] = max(domains, key=domains.get) if domains else None
        return specs

    def _compute_experience_score(self, experience: List[Dict], total_years: float) -> float:
        if not experience: return 0.0
        score = min(total_years / 10, 1.0) * 0.4 + min(len(experience) / 5, 1.0) * 0.2
        total_words = sum(len(exp.get('description', '').split()) for exp in experience)
        score += min(total_words / 500, 1.0) * 0.2
        companies = set(exp.get('company', '').lower() for exp in experience)
        score += min(len(companies) / 3, 1.0) * 0.2
        return min(score, 1.0)

    def _compute_education_score(self, education: List[Dict]) -> float:
        if not education: return 0.0
        score = 0.0
        for edu in education:
            deg = edu.get('degree', '').lower()
            if any(k in deg for k in ['ph.d', 'phd', 'doctorate']): score = max(score, 1.0)
            elif any(k in deg for k in ['master', 'mba']): score = max(score, 0.85)
            elif any(k in deg for k in ['bachelor', 'b.s', 'b.e']): score = max(score, 0.7)
            elif 'associate' in deg: score = max(score, 0.5)
            gpa = edu.get('gpa', '')
            if gpa:
                try:
                    gv = float(gpa)
                    if gv >= 3.5: score += 0.1
                    elif gv >= 3.0: score += 0.05
                except: pass
        return min(score, 1.0)

    def _compute_project_score(self, projects: List[Dict], skills: List[str]) -> float:
        if not projects: return 0.0
        score = min(len(projects) / 5, 1.0) * 0.3 + min(sum(len(p.get('description', '').split()) for p in projects) / 300, 1.0) * 0.4 + min(sum(len(p.get('technologies', [])) for p in projects) / 10, 1.0) * 0.3
        return min(score, 1.0)

    def _compute_practical_exposure_score(self, projects, experience, skills, tools) -> float:
        score = min(len(projects) / 5, 1.0) * 0.4 + min(sum(1 for exp in experience if 'intern' in exp.get('title', '').lower()) / 3, 1.0) * 0.3
        prod_tools = ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'git', 'ci/cd']
        all_t = [t.lower() for t in tools + skills]
        score += min(sum(1 for t in prod_tools if t in all_t) / 5, 1.0) * 0.3
        return min(score, 1.0)

    def _compute_problem_solving_depth_score(self, projects, experience) -> float:
        kws = ['solved', 'implemented', 'developed', 'designed', 'optimized', 'reduced', 'improved', 'created', 'built', 'achieved', 'delivered']
        p_desc = ' '.join([p.get('description', '') for p in projects]).lower()
        e_desc = ' '.join([e.get('description', '') for e in experience]).lower()
        p_s = (min(len(p_desc.split()) / 300, 1.0) * 0.5 + min(sum(1 for kw in kws if kw in p_desc) / 5, 1.0) * 0.5) * 0.5
        e_s = (min(len(e_desc.split()) / 500, 1.0) * 0.5 + min(sum(1 for kw in kws if kw in e_desc) / 5, 1.0) * 0.5) * 0.5
        return min(p_s + e_s, 1.0)

    def _compute_project_complexity_score(self, projects) -> float:
        if not projects: return 0.0
        comp_kws = ['microservices', 'distributed', 'scalable', 'architecture', 'machine learning', 'deep learning', 'ai', 'blockchain', 'real-time', 'high-performance', 'enterprise', 'cloud-native']
        score = sum((min(sum(1 for kw in comp_kws if kw in p.get('description', '').lower()) / 3, 1.0) * 0.5 + min(len(p.get('technologies', [])) / 5, 1.0) * 0.5) for p in projects)
        return min(score / len(projects), 1.0)

    def _compute_production_tools_usage_score(self, projects, experience, tools) -> float:
        pts = ['docker', 'kubernetes', 'jenkins', 'git', 'terraform', 'aws', 'azure', 'gcp']
        all_txt = ' '.join([p.get('description', '') for p in projects] + [e.get('description', '') for e in experience] + tools).lower()
        return min(sum(1 for t in pts if t in all_txt) / 5, 1.0)

    def _compute_internship_relevance_score(self, experience, skills) -> float:
        internships = [e for e in experience if 'intern' in e.get('title', '').lower()]
        return min(len(internships) / 2, 1.0) if internships else 0.0

    def _compute_resume_authenticity_score(self, skills, experience, projects) -> float:
        score = 1.0
        sk_names = set(NormalizationService.normalize_skills(skills))
        if len(sk_names) > 30: score -= 0.3
        elif len(sk_names) > 20: score -= 0.1
        all_desc = ' '.join([e.get('description', '') for e in experience] + [p.get('description', '') for p in projects])
        if len(all_desc.split()) > 200: score = min(score + 0.1, 1.0)
        return max(score, 0.0)

    def _detect_keyword_stuffing(self, skills: List) -> bool:
        sk_names = NormalizationService.normalize_skills(skills)
        return len(sk_names) != len(set(sk_names)) or len(sk_names) > 30

    def _compute_production_tools_percentage(self, skills, tools=None) -> Dict[str, Any]:
        prod_tools = {'cloud': ['aws', 'azure', 'gcp'], 'containers': ['docker', 'kubernetes'], 'ci_cd': ['jenkins', 'github actions'], 'infra': ['terraform', 'ansible'], 'vcs': ['git', 'github']}
        all_it = [s.lower() for s in NormalizationService.normalize_skills(skills + (tools or []))]
        found = []
        cats = {}
        for c, tl in prod_tools.items():
            ct = [t for t in tl if any(t in i for i in all_it)]
            cats[c] = ct
            found.extend(ct)
        return {'percentage': round((sum(1 for t in cats.values() if t) / len(prod_tools)) * 100, 2), 'found': list(set(found))}

    def _compute_role_alignment_score(self, resume_data: Dict) -> float:
        role = resume_data.get('applied_role', '')
        if not role: return 0.5
        kws = DOMAIN_KEYWORDS.get(role.lower(), []) # Fallback to domain keywords if match
        if not kws: return 0.5
        skills = [s.lower() for s in NormalizationService.normalize_skills(resume_data.get('skills', []))]
        sk_align = sum(1 for kw in kws if kw in skills) / len(kws)
        exp_titles = ' '.join([e.get('title', '').lower() for e in resume_data.get('experience', [])])
        exp_align = sum(1 for kw in kws if kw in exp_titles) / len(kws)
        return (sk_align + exp_align) / 2

    def _compute_achievement_orientation_score(self, experience, projects) -> float:
        akws = ['achieved', 'delivered', 'launched', 'optimized', 'led']
        txt = ' '.join([e.get('description', '') for e in experience] + [p.get('description', '') for p in projects]).lower()
        return min(sum(1 for kw in akws if kw in txt) / 5, 1.0) * 0.6 + min(sum(1 for it in ['%', 'user', 'revenue'] if it in txt) / 3, 1.0) * 0.4

    def _compute_technical_clarity_score(self, skills, experience, projects) -> float:
        sk_clarity = min(len(skills) / 10, 1.0) if skills else 0.0
        txt = ' '.join([e.get('description', '') for e in experience] + [p.get('description', '') for p in projects]).lower()
        term_clarity = min(sum(1 for t in ['api', 'database', 'architecture'] if t in txt) / 3, 1.0)
        return sk_clarity * 0.4 + term_clarity * 0.6
