"""
PHASE 2: Advanced Feature Engineering Layer
===========================================

This module implements advanced feature engineering techniques:
1. TF-IDF vectorization for text similarity
2. Cosine similarity computation
3. Embedding-based similarity
4. Categorical encoding
5. Feature normalization
6. Resume inflation detection

This converts raw extracted features into production-ready ML features.
"""

import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
import math

logger = logging.getLogger(__name__)


class AdvancedFeatureEngine:
    """
    Advanced Feature Engineering for ML Model Input.
    
    Implements:
    - TF-IDF vectorization
    - Cosine similarity
    - Embedding-based similarity
    - Feature normalization
    - Resume inflation detection
    """
    
    # =========================================================================
    # SKILL CORPUS FOR TF-IDF
    # =========================================================================
    
    SKILL_CORPUS = {
        'programming': [
            'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#',
            'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r'
        ],
        'web_frontend': [
            'html', 'css', 'react', 'vue', 'angular', 'next.js', 'redux',
            'bootstrap', 'tailwind', 'sass', 'less', 'webpack'
        ],
        'web_backend': [
            'django', 'flask', 'fastapi', 'express', 'node.js', 'spring',
            'rails', 'laravel', 'asp.net', 'graphql', 'rest api'
        ],
        'database': [
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'oracle', 'cassandra', 'dynamodb', 'firebase', 'sqlite'
        ],
        'cloud': [
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
            'jenkins', 'ci/cd', 'nginx', 'apache'
        ],
        'ml_ai': [
            'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas',
            'numpy', 'machine learning', 'deep learning', 'nlp', 'computer vision'
        ],
        'tools': [
            'git', 'github', 'gitlab', 'jira', 'confluence', 'postman',
            'vs code', 'intellij', 'jupyter', 'docker'
        ]
    }
    
    def __init__(self):
        """Initialize the feature engine."""
        self._build_idf_cache()
        
    def _build_idf_cache(self):
        """Pre-compute IDF values for skill corpus."""
        self.idf_cache = {}
        
        # Calculate IDF for each skill category
        for category, skills in self.SKILL_CORPUS.items():
            # Assume document frequency based on corpus size
            # In production, compute from actual resume corpus
            doc_freq = {skill: 0.1 + (i * 0.01) for i, skill in enumerate(skills)}
            
            # IDF = log(N / df)
            N = 1000  # Assume corpus size
            self.idf_cache[category] = {
                skill: math.log(N / (df + 1)) + 1 
                for skill, df in doc_freq.items()
            }
    
    # =========================================================================
    # TF-IDF VECTORIZATION
    # =========================================================================
    
    def compute_tfidf_vector(
        self, 
        skills: List[str], 
        category: Optional[str] = None
    ) -> Dict[str, float]:
        """
        Compute TF-IDF vector for skills.
        
        Args:
            skills: List of skills from resume
            category: Optional skill category to filter
            
        Returns:
            Dictionary of skill -> tfidf_score
        """
        # Calculate term frequency
        skill_counts = Counter([s.lower() for s in skills])
        total_skills = len(skills) if skills else 1
        
        tf_scores = {
            skill: count / total_skills 
            for skill, count in skill_counts.items()
        }
        
        # Get IDF values
        if category and category in self.idf_cache:
            idf_values = self.idf_cache[category]
        else:
            # Use all categories
            idf_values = {}
            for cat_idf in self.idf_cache.values():
                idf_values.update(cat_idf)
        
        # Compute TF-IDF
        tfidf = {}
        for skill, tf in tf_scores.items():
            idf = idf_values.get(skill, 1.5)  # Default IDF
            tfidf[skill] = tf * idf
        
        return tfidf
    
    def compute_skill_tfidf_similarity(
        self, 
        resume_skills: List[str], 
        required_skills: List[str]
    ) -> float:
        """
        Compute TF-IDF based similarity between resume and required skills.
        
        Args:
            resume_skills: Skills from resume
            required_skills: Required skills for role
            
        Returns:
            Cosine similarity score (0-1)
        """
        # Get TF-IDF vectors
        resume_tfidf = self.compute_tfidf_vector(resume_skills)
        required_tfidf = self.compute_tfidf_vector(required_skills)
        
        # Get all unique skills
        all_skills = set(resume_tfidf.keys()) | set(required_tfidf.keys())
        
        if not all_skills:
            return 0.5
        
        # Create vectors
        resume_vec = np.array([resume_tfidf.get(s, 0) for s in all_skills])
        required_vec = np.array([required_tfidf.get(s, 0) for s in all_skills])
        
        # Compute cosine similarity
        similarity = self._cosine_similarity(resume_vec, required_vec)
        
        return similarity
    
    # =========================================================================
    # COSINE SIMILARITY
    # =========================================================================
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def compute_domain_similarity_advanced(
        self,
        resume_skills: List[str],
        required_domains: List[str]
    ) -> float:
        """
        Compute domain similarity using embedding-based approach.
        
        Args:
            resume_skills: Skills from resume
            required_domains: Required domain areas
            
        Returns:
            Domain similarity score (0-1)
        """
        # Domain to skills mapping
        domain_skills_map = {
            'frontend': self.SKILL_CORPUS['web_frontend'] + self.SKILL_CORPUS['programming'][:3],
            'backend': self.SKILL_CORPUS['web_backend'] + self.SKILL_CORPUS['programming'][:3],
            'fullstack': self.SKILL_CORPUS['web_frontend'] + self.SKILL_CORPUS['web_backend'],
            'data_science': self.SKILL_CORPUS['ml_ai'] + ['python', 'sql'],
            'ml': self.SKILL_CORPUS['ml_ai'],
            'devops': self.SKILL_CORPUS['cloud'] + self.SKILL_CORPUS['tools'],
            'mobile': ['react native', 'flutter', 'swift', 'kotlin', 'android', 'ios'],
            'software': self.SKILL_CORPUS['programming'][:5]
        }
        
        if not required_domains:
            return 0.5
        
        # Collect domain skills
        domain_skills = []
        for domain in required_domains:
            if domain.lower() in domain_skills_map:
                domain_skills.extend(domain_skills_map[domain.lower()])
        
        if not domain_skills:
            return 0.5
        
        # Compute similarity using TF-IDF
        similarity = self.compute_skill_tfidf_similarity(resume_skills, domain_skills)
        
        return similarity
    
    # =========================================================================
    # FEATURE NORMALIZATION
    # =========================================================================
    
    def normalize_features(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Normalize all numerical features to 0-1 range.
        
        Uses min-max normalization with domain-specific scales.
        
        Args:
            features: Raw feature dictionary
            
        Returns:
            Normalized feature dictionary
        """
        normalized = {}
        
        # Experience normalization
        normalized['experience_months_norm'] = self._normalize_experience(
            features.get('experience_duration_months', 0)
        )
        
        # Project count normalization
        normalized['project_count_norm'] = self._normalize_project_count(
            features.get('project_count', 0)
        )
        
        # Skill count normalization
        normalized['skill_count_norm'] = self._normalize_skill_count(
            features.get('skill_count', 0)
        )
        
        # GPA normalization (handle different scales)
        normalized['gpa_norm'] = self._normalize_gpa(
            features.get('gpa_normalized', 0),
            features.get('degree_level_encoded', 1)
        )
        
        # Hackathon normalization
        normalized['hackathon_norm'] = min(features.get('hackathon_count', 0) / 5, 1.0)
        
        return normalized
    
    def _normalize_experience(self, months: int) -> float:
        """Normalize experience months to 0-1."""
        # Cap at 36 months (3 years)
        return min(months / 36, 1.0)
    
    def _normalize_project_count(self, count: int) -> float:
        """Normalize project count to 0-1."""
        # Optimal: 3-5 projects
        if count <= 0:
            return 0.1
        elif count <= 2:
            return 0.4
        elif count <= 5:
            return 1.0
        elif count <= 8:
            return 0.9
        else:
            return 0.7
    
    def _normalize_skill_count(self, count: int) -> float:
        """Normalize skill count to 0-1."""
        # Optimal: 8-15 skills
        if count <= 0:
            return 0.1
        elif count <= 5:
            return 0.4
        elif count <= 15:
            return 1.0
        elif count <= 20:
            return 0.9
        else:
            # Too many skills might be keyword stuffing
            return max(0.7 - (count - 20) * 0.05, 0.3)
    
    def _normalize_gpa(self, gpa: float, degree_level: int) -> float:
        """Normalize GPA based on degree level."""
        # Adjust expected GPA based on degree
        if degree_level == 1:  # High school
            expected_max = 10.0
        elif degree_level == 2:  # Bachelor
            expected_max = 10.0
        else:  # Masters+
            expected_max = 4.0
        
        return min(gpa / expected_max if expected_max > 0 else gpa, 1.0)
    
    # =========================================================================
    # CATEGORICAL ENCODING
    # =========================================================================
    
    def encode_categorical(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Encode categorical variables to numerical.
        
        Args:
            features: Raw feature dictionary
            
        Returns:
            Encoded feature dictionary
        """
        encoded = {}
        
        # Degree level encoding (already numerical but ensure 0-1)
        degree = features.get('degree_level_encoded', 1)
        encoded['degree_level_norm'] = degree / 3  # Max 3
        
        # University tier encoding
        tier = features.get('university_tier_score', 0.5)
        encoded['university_tier_encoded'] = tier
        
        # Binary flags
        encoded['has_internship'] = 1.0 if features.get('internship_relevance_score', 0) > 0.3 else 0.0
        encoded['has_production_exp'] = 1.0 if features.get('production_tools_usage_score', 0) > 0.3 else 0.0
        encoded['has_quantified_impact'] = 1.0 if features.get('quantified_impact_presence', False) else 0.0
        encoded['mandatory_skills_met'] = 1.0 if features.get('mandatory_skill_coverage', False) else 0.0
        
        return encoded
    
    # =========================================================================
    # RESUME INFLATION DETECTION
    # =========================================================================
    
    def detect_resume_inflation(
        self,
        skills: List[str],
        projects: List[Dict],
        raw_text: str
    ) -> Dict[str, Any]:
        """
        Detect resume inflation using skill vs usage mismatch.
        
        Algorithm:
        1. Compare listed skills with skills actually used in projects
        2. Check for unrealistic skill combinations
        3. Analyze keyword density patterns
        
        Args:
            skills: List of skills from resume
            projects: List of projects
            raw_text: Raw resume text
            
        Returns:
            Inflation detection results
        """
        results = {
            'inflation_detected': False,
            'inflation_score': 0.0,
            'flags': [],
            'skill_usage_mismatch': 0.0
        }
        
        if not skills or not raw_text:
            return results
        
        logger.info(f"Detecting inflation: skills={len(skills)} words={len(raw_text.split())}")
        
        # 1. Skill usage mismatch
        project_text = ' '.join([
            str(p.get('description', '')) + ' ' + str(p.get('technologies', ''))
            for p in projects if isinstance(p, dict)
        ]).lower()
        
        mentioned_in_projects = sum(
            1 for skill in skills 
            if skill.lower() in project_text
        )
        
        if len(skills) > 0:
            usage_ratio = mentioned_in_projects / len(skills)
            results['skill_usage_mismatch'] = 1.0 - usage_ratio
            
            # Flag if too many skills not used in projects
            if usage_ratio < 0.3:
                results['flags'].append('Low skill-to-project usage ratio')
                results['inflation_score'] += 0.3
        
        # 2. Unrealistic skill combinations
        unrealistic_combos = [
            ('react', 'angular'),  # Usually one or the other
            ('vue', 'react'),
            ('django', 'flask'),  # Possible but rare for freshers
            ('tensorflow', 'pytorch'),  # Possible but rare for freshers
        ]
        
        skills_lower = [s.lower() for s in skills]
        for combo in unrealistic_combos:
            if combo[0] in skills_lower and combo[1] in skills_lower:
                results['flags'].append(f'Unrealistic skill combination: {combo}')
                results['inflation_score'] += 0.15
        
        # 3. Keyword density check
        total_words = len(raw_text.split())
        skill_mentions = sum(len(skill.split()) for skill in skills)
        
        if total_words > 0:
            keyword_density = skill_mentions / total_words
            
            # High keyword density might indicate stuffing
            if keyword_density > 0.15:
                results['flags'].append('High keyword density')
                results['inflation_score'] += 0.2
        
        # 4. Check for skill bloating
        if len(skills) > 20:
            results['flags'].append(f'Excessive skill listing ({len(skills)})')
            results['inflation_score'] += 0.25
        
        # Final decision
        results['inflation_detected'] = results['inflation_score'] > 0.4
        results['inflation_score'] = min(results['inflation_score'], 1.0)
        
        if results['inflation_detected']:
            logger.warning(f"Inflation detected: score={results['inflation_score']} flags={results['flags']}")
        
        return results
    
    # =========================================================================
    # FINAL FEATURE VECTOR
    # =========================================================================
    
    def build_ml_feature_vector(
        self,
        raw_features: Dict[str, Any],
        resume_skills: List[str] = None,
        required_skills: List[str] = None,
        projects: List[Dict] = None,
        raw_text: str = ''
    ) -> Dict[str, float]:
        """
        Build final ML-ready feature vector.
        
        Combines all feature engineering techniques:
        - TF-IDF similarity
        - Cosine similarity
        - Normalization
        - Categorical encoding
        - Inflation detection
        
        Args:
            raw_features: Features from Phase 1
            resume_skills: Skills from resume
            required_skills: Required skills for role
            projects: Projects from resume
            raw_text: Raw resume text
            
        Returns:
            Final ML-ready feature vector
        """
        features = {}
        logger.info(f"Building ML feature vector: skills={len(resume_skills or [])} projects={len(projects or [])}")
        
        # 1. TF-IDF similarity
        if resume_skills and required_skills:
            features['tfidf_skill_similarity'] = self.compute_skill_tfidf_similarity(
                resume_skills, required_skills
            )
        
        # 2. Domain similarity (embedding-based)
        features['domain_similarity_advanced'] = self.compute_domain_similarity_advanced(
            resume_skills or [],
            raw_features.get('required_domains', [])
        )
        
        # 3. Normalization
        normalized = self.normalize_features(raw_features)
        features.update(normalized)
        
        # 4. Categorical encoding
        encoded = self.encode_categorical(raw_features)
        features.update(encoded)
        
        # 5. Resume inflation detection
        if resume_skills:
            inflation = self.detect_resume_inflation(
                resume_skills,
                projects or [],
                raw_text
            )
            features['inflation_score'] = inflation['inflation_score']
            features['inflation_detected'] = 1.0 if inflation['inflation_detected'] else 0.0
        
        # 6. Derived composite scores
        features['technical_readiness'] = self._compute_technical_readiness(features)
        features['learning_aptitude'] = self._compute_learning_aptitude(features)
        
        return features
    
    def _compute_technical_readiness(self, features: Dict[str, float]) -> float:
        """Compute technical readiness score."""
        score = (
            features.get('tfidf_skill_similarity', 0.5) * 0.30 +
            features.get('project_count_norm', 0.5) * 0.25 +
            features.get('has_production_exp', 0) * 0.25 +
            features.get('skill_count_norm', 0.5) * 0.20
        )
        return min(score, 1.0)
    
    def _compute_learning_aptitude(self, features: Dict[str, float]) -> float:
        """Compute learning aptitude score."""
        score = (
            features.get('degree_level_norm', 0.5) * 0.30 +
            features.get('gpa_norm', 0.5) * 0.25 +
            features.get('hackathon_norm', 0) * 0.20 +
            features.get('has_internship', 0) * 0.25
        )
        return min(score, 1.0)


# Singleton instance
advanced_feature_engine = AdvancedFeatureEngine()
