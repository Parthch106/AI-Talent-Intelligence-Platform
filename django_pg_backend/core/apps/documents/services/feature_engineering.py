"""
Feature Engineering Engine
Transforms resume data into AI-ready features.
"""

import re
import math
from typing import Dict, List, Optional, Any
from collections import Counter
import numpy as np


class FeatureEngineeringEngine:
    """
    Transforms structured resume data into AI-ready features.
    
    Generates:
    - Skill vectors (binary, frequency, TF-IDF)
    - Derived metrics (skill diversity, experience depth, etc.)
    - Overall scoring
    """
    
    # Skill categories for analysis
    SKILL_CATEGORIES = {
        'programming_languages': [
            'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go', 'rust',
            'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql'
        ],
        'web_frameworks': [
            'django', 'flask', 'fastapi', 'spring', 'express', 'react', 'angular', 'vue',
            'next.js', 'nuxt.js', 'node.js', 'asp.net', 'laravel', 'rails'
        ],
        'data_science_ml': [
            'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib',
            'seaborn', 'nltk', 'spacy', 'opencv', 'jupyter', 'tableau', 'power bi',
            'machine learning', 'deep learning', 'data analysis', 'statistics'
        ],
        'cloud_devops': [
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd',
            'terraform', 'ansible', 'linux', 'bash', 'shell', 'nginx', 'apache',
            'cloud', 'devops', 'microservices'
        ],
        'databases': [
            'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle',
            'sql server', 'cassandra', 'dynamodb', 'database'
        ],
        'tools_ides': [
            'git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'figma', 'postman',
            'swagger', 'insomnia', 'vs code', 'visual studio', 'intellij', 'eclipse',
            'docker', 'kubernetes'
        ]
    }
    
    # Leadership indicators in job titles
    LEADERSHIP_KEYWORDS = [
        'lead', 'manager', 'director', 'head', 'chief', 'senior', 'principal',
        'mentor', 'team lead', 'supervisor', 'coordinator', 'owner'
    ]
    
    # Technical vs non-technical indicators
    TECHNICAL_KEYWORDS = [
        'programming', 'coding', 'development', 'engineering', 'software', 'hardware',
        'data', 'machine learning', 'ai', 'cloud', 'devops', 'database', 'security',
        'network', 'web', 'mobile', 'api', 'backend', 'frontend', 'fullstack'
    ]
    
    def __init__(self):
        """Initialize the feature engineering engine."""
        # Pre-compile patterns for efficiency
        self.skill_pattern = re.compile(
            r'\b(' + '|'.join([
                skill for skills in self.SKILL_CATEGORIES.values() 
                for skill in skills
            ]) + r')\b',
            re.IGNORECASE
        )
    
    def compute_features(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute all features from resume data.
        
        Args:
            resume_data: Dictionary containing parsed resume data
            
        Returns:
            Dictionary containing all computed features
        """
        features = {}
        
        # Extract data
        skills = resume_data.get('skills', [])
        experience = resume_data.get('experience', [])
        education = resume_data.get('education', [])
        projects = resume_data.get('projects', [])
        tools = resume_data.get('tools', [])
        total_experience_years = resume_data.get('total_experience_years', 0)
        
        # Normalize skills to strings
        skills = self._normalize_skills(skills)
        tools = self._normalize_skills(tools)
        
        # 1. Skill Vectorization
        features['skill_vector'] = self._compute_skill_vector(skills)
        features['skill_frequency'] = self._compute_skill_frequency(skills)
        features['tfidf_embedding'] = self._compute_tfidf_embedding(skills)
        
        # 2. Category Analysis
        features['skill_categories'] = self._analyze_skill_categories(skills)
        
        # 3. Derived Metrics
        features['skill_diversity_score'] = self._compute_skill_diversity(skills)
        features['experience_depth_score'] = self._compute_experience_depth(
            experience, total_experience_years
        )
        features['technical_ratio'] = self._compute_technical_ratio(skills, tools)
        features['leadership_indicator'] = self._compute_leadership_indicator(experience)
        features['domain_specialization'] = self._compute_domain_specialization(
            skills, experience
        )
        
        # 4. Component Scores
        features['experience_score'] = self._compute_experience_score(
            experience, total_experience_years
        )
        features['education_score'] = self._compute_education_score(education)
        features['project_score'] = self._compute_project_score(projects, skills)
        
        # 5. Overall Score
        features['overall_score'] = self._compute_overall_score(features)
        
        return features
    
    def _normalize_skills(self, skills: List[Any]) -> List[str]:
        """
        Normalize skills to strings.
        Handles both string and dictionary formats.
        """
        normalized = []
        for skill in skills:
            if isinstance(skill, dict):
                # Skill is a dictionary with 'name' field
                skill_name = skill.get('name', '')
            elif isinstance(skill, str):
                # Skill is already a string
                skill_name = skill
            else:
                continue
            
            if skill_name:
                normalized.append(skill_name)
        
        return normalized
    
    def _compute_skill_vector(self, skills: List[str]) -> Dict[str, int]:
        """
        Create binary encoding of skills.
        Each skill is 1 if present, 0 otherwise.
        """
        all_known_skills = set()
        for category_skills in self.SKILL_CATEGORIES.values():
            all_known_skills.update(category_skills)
        
        skills_lower = [s.lower() for s in skills]
        
        vector = {}
        for skill in all_known_skills:
            vector[skill] = 1 if skill.lower() in skills_lower else 0
        
        # Add unknown skills
        for skill in skills:
            skill_lower = skill.lower()
            if skill_lower not in vector:
                vector[skill_lower] = 1
        
        return vector
    
    def _compute_skill_frequency(self, skills: List[str]) -> Dict[str, int]:
        """
        Compute frequency score for each skill.
        Based on occurrence in skills list and related contexts.
        """
        # Count occurrences
        skill_counts = Counter([s.lower() for s in skills])
        
        # Normalize to 0-1 range
        max_count = max(skill_counts.values()) if skill_counts else 1
        frequency = {
            skill: count / max_count 
            for skill, count in skill_counts.items()
        }
        
        return frequency
    
    def _compute_tfidf_embedding(self, skills: List[str]) -> Dict[str, float]:
        """
        Compute TF-IDF-like embedding for skills.
        """
        # For now, use a simple term frequency with IDF penalty for common skills
        idf_weights = {
            'python': 1.0,
            'java': 0.9,
            'javascript': 0.85,
            'react': 0.9,
            'aws': 0.95,
            'docker': 0.95,
            'kubernetes': 0.95,
            'machine learning': 1.0,
            'deep learning': 1.0,
        }
        
        tfidf = {}
        skills_lower = [s.lower() for s in skills]
        
        for skill in skills_lower:
            tf = 1.0  # Single occurrence
            idf = idf_weights.get(skill, 0.7)  # Default IDF
            tfidf[skill] = tf * idf
        
        return tfidf
    
    def _analyze_skill_categories(self, skills: List[str]) -> Dict[str, int]:
        """
        Count skills in each category.
        """
        skills_lower = [s.lower() for s in skills]
        category_counts = {}
        
        for category, category_skills in self.SKILL_CATEGORIES.items():
            count = sum(1 for s in skills_lower if s in category_skills)
            category_counts[category] = count
        
        return category_counts
    
    def _compute_skill_diversity(self, skills: List[str]) -> float:
        """
        Compute skill diversity score (0-1).
        Based on number of unique skills across categories.
        """
        if not skills:
            return 0.0
        
        # Count unique skill categories represented
        skills_lower = [s.lower() for s in skills]
        categories_covered = set()
        
        for category, category_skills in self.SKILL_CATEGORIES.items():
            if any(s in category_skills for s in skills_lower):
                categories_covered.add(category)
        
        # Diversity = categories covered / total categories
        max_categories = len(self.SKILL_CATEGORIES)
        diversity = len(categories_covered) / max_categories
        
        # Bonus for having multiple skills per category
        bonus = min(len(skills) / 20, 1.0) * 0.2
        
        return min(diversity + bonus, 1.0)
    
    def _compute_experience_depth(
        self, 
        experience: List[Dict], 
        total_years: float
    ) -> float:
        """
        Compute experience depth score (0-1).
        Based on tenure, progression, and variety.
        """
        if not experience:
            return 0.0
        
        score = 0.0
        
        # Score based on total years (capped at 10 years)
        score += min(total_years / 10, 1.0) * 0.4
        
        # Score based on number of roles
        score += min(len(experience) / 5, 1.0) * 0.2
        
        # Score based on role progression (titles with increasing seniority)
        seniority_scores = []
        for exp in experience:
            title = exp.get('title', '').lower()
            score_val = 0
            for keyword, val in [
                ('intern', 0.2),
                ('junior', 0.4),
                ('developer', 0.5),
                ('engineer', 0.5),
                ('senior', 0.7),
                ('lead', 0.8),
                ('manager', 0.9),
                ('director', 1.0),
            ]:
                if keyword in title:
                    score_val = val
            seniority_scores.append(score_val)
        
        if seniority_scores:
            # Bonus for progression
            if len(seniority_scores) > 1:
                progression = max(seniority_scores) - min(seniority_scores)
                score += progression * 0.4
        
        return min(score, 1.0)
    
    def _compute_technical_ratio(self, skills: List[str], tools: List[str]) -> float:
        """
        Compute technical vs non-technical ratio (0-1).
        """
        if not skills:
            return 0.0
        
        all_items = skills + tools
        all_items_lower = [s.lower() for s in all_items]
        
        technical_count = sum(
            1 for item in all_items_lower 
            if any(tech in item for tech in self.TECHNICAL_KEYWORDS)
        )
        
        return technical_count / len(all_items) if all_items else 0.0
    
    def _compute_leadership_indicator(self, experience: List[Dict]) -> float:
        """
        Compute leadership indicator score (0-1).
        """
        if not experience:
            return 0.0
        
        leadership_count = 0
        total_roles = len(experience)
        
        for exp in experience:
            title = exp.get('title', '').lower()
            if any(keyword in title for keyword in self.LEADERSHIP_KEYWORDS):
                leadership_count += 1
        
        return leadership_count / total_roles if total_roles > 0 else 0.0
    
    def _compute_domain_specialization(
        self, 
        skills: List[str], 
        experience: List[Dict]
    ) -> Dict[str, float]:
        """
        Compute domain specialization scores.
        """
        skills_lower = [s.lower() for s in skills]
        
        specializations = {}
        
        # Check each category for specialization
        for category, category_skills in self.SKILL_CATEGORIES.items():
            count = sum(1 for s in skills_lower if s in category_skills)
            specializations[category] = min(count / 5, 1.0)  # Cap at 5 skills
        
        # Check experience domains
        domains = {
            'frontend': 0.0,
            'backend': 0.0,
            'fullstack': 0.0,
            'data_science': 0.0,
            'devops': 0.0,
            'mobile': 0.0,
        }
        
        for exp in experience:
            title = exp.get('title', '').lower() + ' ' + exp.get('description', '').lower()
            
            if any(kw in title for kw in ['frontend', 'ui', 'ux', 'react', 'vue', 'angular']):
                domains['frontend'] += 0.3
            
            if any(kw in title for kw in ['backend', 'api', 'server', 'django', 'flask', 'node']):
                domains['backend'] += 0.3
            
            if any(kw in title for kw in ['fullstack', 'full stack']):
                domains['fullstack'] += 0.4
            
            if any(kw in title for kw in ['data', 'ml', 'machine learning', 'analytics']):
                domains['data_science'] += 0.3
            
            if any(kw in title for kw in ['devops', 'cloud', 'infrastructure']):
                domains['devops'] += 0.3
            
            if any(kw in title for kw in ['mobile', 'ios', 'android', 'react native']):
                domains['mobile'] += 0.3
        
        # Normalize domain scores
        for domain in domains:
            domains[domain] = min(domains[domain], 1.0)
        
        specializations['domains'] = domains
        specializations['primary_domain'] = max(domains, key=domains.get) if domains else None
        
        return specializations
    
    def _compute_experience_score(
        self, 
        experience: List[Dict], 
        total_years: float
    ) -> float:
        """
        Compute overall experience score (0-1).
        """
        if not experience:
            return 0.0
        
        score = 0.0
        
        # Years of experience (40%)
        score += min(total_years / 10, 1.0) * 0.4
        
        # Number of roles (20%)
        score += min(len(experience) / 5, 1.0) * 0.2
        
        # Description quality (word count) (20%)
        total_words = sum(
            len(exp.get('description', '').split()) 
            for exp in experience
        )
        score += min(total_words / 500, 1.0) * 0.2
        
        # Company diversity (20%)
        companies = set(exp.get('company', '').lower() for exp in experience)
        score += min(len(companies) / 3, 1.0) * 0.2
        
        return min(score, 1.0)
    
    def _compute_education_score(self, education: List[Dict]) -> float:
        """
        Compute education score (0-1).
        """
        if not education:
            return 0.0
        
        score = 0.0
        
        for edu in education:
            degree = edu.get('degree', '').lower()
            
            # Degree level scoring
            if 'ph.d' in degree or 'phd' in degree or 'doctorate' in degree:
                score = max(score, 1.0)
            elif 'master' in degree or 'mba' in degree:
                score = max(score, 0.85)
            elif 'bachelor' in degree or 'b.s' in degree or 'b.e' in degree:
                score = max(score, 0.7)
            elif 'associate' in degree:
                score = max(score, 0.5)
            
            # GPA bonus (if available)
            gpa = edu.get('gpa', '')
            if gpa:
                try:
                    gpa_float = float(gpa)
                    if gpa_float >= 3.5:
                        score += 0.1
                    elif gpa_float >= 3.0:
                        score += 0.05
                except (ValueError, TypeError):
                    pass
        
        return min(score, 1.0)
    
    def _compute_project_score(
        self, 
        projects: List[Dict], 
        skills: List[str]
    ) -> float:
        """
        Compute project score (0-1).
        """
        if not projects:
            return 0.0
        
        score = 0.0
        
        # Number of projects (30%)
        score += min(len(projects) / 5, 1.0) * 0.3
        
        # Description quality (40%)
        total_words = sum(
            len(p.get('description', '').split()) 
            for p in projects
        )
        score += min(total_words / 300, 1.0) * 0.4
        
        # Technologies used (30%)
        tech_count = sum(
            len(p.get('technologies', [])) 
            for p in projects
        )
        score += min(tech_count / 10, 1.0) * 0.3
        
        return min(score, 1.0)
    
    def _compute_overall_score(self, features: Dict[str, Any]) -> float:
        """
        Compute overall AI-readiness score (0-1).
        """
        weights = {
            'skill_diversity_score': 0.25,
            'experience_depth_score': 0.20,
            'experience_score': 0.20,
            'education_score': 0.15,
            'project_score': 0.10,
            'technical_ratio': 0.10,
        }
        
        score = 0.0
        for metric, weight in weights.items():
            value = features.get(metric, 0.0)
            score += value * weight
        
        return round(score, 4)
    
    # Phase 2 - Part 1: Resume Analysis Methods
    
    def compute_skill_to_role_match(
        self,
        resume_data: Dict[str, Any],
        role_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compute skill-to-role matching metrics.
        
        Args:
            resume_data: Dictionary containing parsed resume data
            role_requirements: Dictionary containing role requirements
            
        Returns:
            Dictionary containing skill-to-role matching metrics
        """
        skills = self._normalize_skills(resume_data.get('skills', []))
        tools = self._normalize_skills(resume_data.get('tools', []))
        all_skills = skills + tools
        
        required_core_skills = role_requirements.get('required_core_skills', [])
        preferred_skills = role_requirements.get('preferred_skills', [])
        
        # Normalize to lowercase for comparison
        all_skills_lower = [s.lower() for s in all_skills]
        required_lower = [s.lower() for s in required_core_skills]
        preferred_lower = [s.lower() for s in preferred_skills]
        
        # Compute skill overlap percentage
        total_required = len(required_core_skills)
        matched_required = sum(1 for skill in required_lower if skill in all_skills_lower)
        skill_match_percentage = (matched_required / total_required * 100) if total_required > 0 else 0.0
        
        # Compute core skill match score (0-1)
        core_skill_match_score = matched_required / total_required if total_required > 0 else 0.0
        
        # Compute optional skill bonus score (0-1)
        total_preferred = len(preferred_skills)
        matched_preferred = sum(1 for skill in preferred_lower if skill in all_skills_lower)
        optional_skill_bonus_score = matched_preferred / total_preferred if total_preferred > 0 else 0.0
        
        # Identify missing critical skills
        missing_critical = [skill for skill in required_core_skills if skill.lower() not in all_skills_lower]
        critical_skill_gap_count = len(missing_critical)
        
        # Compute domain relevance score
        required_domains = role_requirements.get('required_domains', [])
        domain_relevance_score = self._compute_domain_relevance(
            all_skills_lower,
            required_domains
        )
        
        return {
            'skill_match_percentage': round(skill_match_percentage, 2),
            'core_skill_match_score': round(core_skill_match_score, 4),
            'optional_skill_bonus_score': round(optional_skill_bonus_score, 4),
            'critical_skill_gap_count': critical_skill_gap_count,
            'missing_critical_skills': missing_critical,
            'domain_relevance_score': round(domain_relevance_score, 4),
        }
    
    def _compute_domain_relevance(
        self,
        skills: List[str],
        required_domains: List[str]
    ) -> float:
        """
        Compute domain relevance score (0-1).
        """
        if not required_domains:
            return 0.5  # Default score if no domains specified
        
        # Domain keywords mapping
        domain_keywords = {
            'frontend': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'ui', 'ux'],
            'backend': ['django', 'flask', 'fastapi', 'node.js', 'express', 'api', 'rest', 'graphql', 'server'],
            'fullstack': ['react', 'django', 'flask', 'node.js', 'express', 'fullstack', 'full stack'],
            'data_science': ['pandas', 'numpy', 'matplotlib', 'seaborn', 'scikit-learn', 'data analysis', 'statistics'],
            'machine_learning': ['tensorflow', 'pytorch', 'keras', 'machine learning', 'deep learning', 'neural'],
            'devops': ['docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'aws', 'azure', 'gcp'],
            'mobile': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'mobile'],
        }
        
        domain_scores = {}
        for domain in required_domains:
            keywords = domain_keywords.get(domain.lower(), [])
            if keywords:
                matched = sum(1 for kw in keywords if any(kw in skill for skill in skills))
                domain_scores[domain] = min(matched / len(keywords), 1.0) if keywords else 0.0
        
        if not domain_scores:
            return 0.5
        
        return sum(domain_scores.values()) / len(domain_scores)
    
    def compute_project_experience_depth(
        self,
        resume_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compute project and experience depth evaluation metrics.
        
        Args:
            resume_data: Dictionary containing parsed resume data
            
        Returns:
            Dictionary containing project and experience depth metrics
        """
        projects = resume_data.get('projects', [])
        experience = resume_data.get('experience', [])
        skills = self._normalize_skills(resume_data.get('skills', []))
        tools = self._normalize_skills(resume_data.get('tools', []))
        
        # Practical Exposure Score
        practical_exposure_score = self._compute_practical_exposure_score(
            projects, experience, skills, tools
        )
        
        # Problem-Solving Depth Score
        problem_solving_depth_score = self._compute_problem_solving_depth_score(
            projects, experience
        )
        
        # Project Complexity Score
        project_complexity_score = self._compute_project_complexity_score(projects)
        
        # Production Tools Usage Score
        production_tools_usage_score = self._compute_production_tools_usage_score(
            projects, experience, tools
        )
        
        # Internship Relevance Score
        internship_relevance_score = self._compute_internship_relevance_score(
            experience, skills
        )
        
        return {
            'practical_exposure_score': round(practical_exposure_score, 4),
            'problem_solving_depth_score': round(problem_solving_depth_score, 4),
            'project_complexity_score': round(project_complexity_score, 4),
            'production_tools_usage_score': round(production_tools_usage_score, 4),
            'internship_relevance_score': round(internship_relevance_score, 4),
        }
    
    def _compute_practical_exposure_score(
        self,
        projects: List[Dict],
        experience: List[Dict],
        skills: List[str],
        tools: List[str]
    ) -> float:
        """
        Compute practical exposure score (0-1).
        Based on number of real projects, internships, and hands-on experience.
        """
        score = 0.0
        
        # Number of projects (40%)
        project_count = len(projects)
        score += min(project_count / 5, 1.0) * 0.4
        
        # Number of internships (30%)
        internship_count = sum(
            1 for exp in experience
            if 'intern' in exp.get('title', '').lower()
        )
        score += min(internship_count / 3, 1.0) * 0.3
        
        # Hands-on tools usage (30%)
        production_tools = ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'git', 'ci/cd']
        tools_lower = [t.lower() for t in tools + skills]
        production_count = sum(1 for tool in production_tools if tool in tools_lower)
        score += min(production_count / 5, 1.0) * 0.3
        
        return min(score, 1.0)
    
    def _compute_problem_solving_depth_score(
        self,
        projects: List[Dict],
        experience: List[Dict]
    ) -> float:
        """
        Compute problem-solving depth score (0-1).
        Based on complexity of projects and experience descriptions.
        """
        score = 0.0
        
        # Problem-solving keywords
        problem_keywords = [
            'solved', 'implemented', 'developed', 'designed', 'optimized',
            'reduced', 'improved', 'created', 'built', 'achieved', 'delivered'
        ]
        
        # Analyze project descriptions (50%)
        project_descriptions = ' '.join([p.get('description', '') for p in projects])
        project_word_count = len(project_descriptions.split())
        problem_keyword_count = sum(
            1 for kw in problem_keywords if kw in project_descriptions.lower()
        )
        
        # Score based on description length and problem-solving keywords
        desc_score = min(project_word_count / 300, 1.0) * 0.5
        keyword_score = min(problem_keyword_count / 5, 1.0) * 0.5
        score += (desc_score + keyword_score) * 0.5
        
        # Analyze experience descriptions (50%)
        exp_descriptions = ' '.join([e.get('description', '') for e in experience])
        exp_word_count = len(exp_descriptions.split())
        exp_keyword_count = sum(
            1 for kw in problem_keywords if kw in exp_descriptions.lower()
        )
        
        exp_desc_score = min(exp_word_count / 500, 1.0) * 0.5
        exp_keyword_score = min(exp_keyword_count / 5, 1.0) * 0.5
        score += (exp_desc_score + exp_keyword_score) * 0.5
        
        return min(score, 1.0)
    
    def _compute_project_complexity_score(self, projects: List[Dict]) -> float:
        """
        Compute project complexity score (0-1).
        Based on technical complexity of projects.
        """
        if not projects:
            return 0.0
        
        score = 0.0
        
        # Complexity indicators
        complexity_keywords = [
            'microservices', 'distributed', 'scalable', 'architecture',
            'machine learning', 'deep learning', 'ai', 'blockchain',
            'real-time', 'high-performance', 'enterprise', 'cloud-native'
        ]
        
        for project in projects:
            description = project.get('description', '').lower()
            technologies = [t.lower() for t in project.get('technologies', [])]
            
            # Check for complexity keywords
            complexity_count = sum(
                1 for kw in complexity_keywords if kw in description
            )
            
            # Check for technology stack depth
            tech_count = len(technologies)
            
            # Project score
            project_score = min(complexity_count / 3, 1.0) * 0.5 + min(tech_count / 5, 1.0) * 0.5
            score += project_score
        
        return min(score / len(projects), 1.0) if projects else 0.0
    
    def _compute_production_tools_usage_score(
        self,
        projects: List[Dict],
        experience: List[Dict],
        tools: List[str]
    ) -> float:
        """
        Compute production tools usage score (0-1).
        Based on use of production-grade tools and technologies.
        """
        production_tools = [
            'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins',
            'git', 'github', 'gitlab', 'ci/cd', 'terraform', 'ansible',
            'nginx', 'apache', 'redis', 'postgresql', 'mongodb', 'elasticsearch'
        ]
        
        tools_lower = [t.lower() for t in tools]
        
        # Count production tools used
        production_count = sum(1 for tool in production_tools if tool in tools_lower)
        
        # Check for production tools in project descriptions
        all_descriptions = ' '.join([p.get('description', '') for p in projects])
        all_descriptions += ' '.join([e.get('description', '') for e in experience])
        
        desc_production_count = sum(
            1 for tool in production_tools if tool in all_descriptions.lower()
        )
        
        # Combined score
        total_production = production_count + desc_production_count
        return min(total_production / 8, 1.0)
    
    def _compute_internship_relevance_score(
        self,
        experience: List[Dict],
        skills: List[str]
    ) -> float:
        """
        Compute internship experience relevance score (0-1).
        Based on relevance of internship experience to technical skills.
        """
        internships = [
            exp for exp in experience
            if 'intern' in exp.get('title', '').lower()
        ]
        
        if not internships:
            return 0.0
        
        score = 0.0
        
        # Technical keywords for relevance
        tech_keywords = [
            'developed', 'implemented', 'built', 'created', 'designed',
            'programming', 'coding', 'software', 'application', 'system',
            'database', 'api', 'web', 'mobile', 'backend', 'frontend'
        ]
        
        for internship in internships:
            description = internship.get('description', '').lower()
            
            # Check for technical relevance
            tech_count = sum(1 for kw in tech_keywords if kw in description)
            relevance = min(tech_count / 5, 1.0)
            
            score += relevance
        
        return min(score / len(internships), 1.0) if internships else 0.0
    
    def compute_resume_quality_indicators(
        self,
        resume_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compute resume quality indicators.
        
        Args:
            resume_data: Dictionary containing parsed resume data
            
        Returns:
            Dictionary containing resume quality metrics
        """
        skills = resume_data.get('skills', [])
        experience = resume_data.get('experience', [])
        projects = resume_data.get('projects', [])
        education = resume_data.get('education', [])
        
        # Resume Authenticity Score
        resume_authenticity_score = self._compute_resume_authenticity_score(
            skills, experience, projects
        )
        
        # Clarity & Structure Score
        clarity_structure_score = self._compute_clarity_structure_score(
            resume_data
        )
        
        # Keyword Stuffing Flag
        keyword_stuffing_flag = self._detect_keyword_stuffing(skills)
        
        # Role Alignment Score
        role_alignment_score = self._compute_role_alignment_score(resume_data)
        
        # Achievement Orientation Score
        achievement_orientation_score = self._compute_achievement_orientation_score(
            experience, projects
        )
        
        # Technical Clarity Score
        technical_clarity_score = self._compute_technical_clarity_score(
            skills, experience, projects
        )
        
        return {
            'resume_authenticity_score': round(resume_authenticity_score, 4),
            'clarity_structure_score': round(clarity_structure_score, 4),
            'keyword_stuffing_flag': keyword_stuffing_flag,
            'role_alignment_score': round(role_alignment_score, 4),
            'achievement_orientation_score': round(achievement_orientation_score, 4),
            'technical_clarity_score': round(technical_clarity_score, 4),
        }
    
    def _compute_resume_authenticity_score(
        self,
        skills: List,
        experience: List[Dict],
        projects: List[Dict]
    ) -> float:
        """
        Compute resume authenticity score (0-1).
        Checks for keyword stuffing vs real content.
        """
        score = 1.0  # Start with full score
        
        # Check for excessive skill repetition
        skill_names = set()
        for skill in skills:
            if isinstance(skill, dict):
                skill_names.add(skill.get('name', '').lower())
            elif isinstance(skill, str):
                skill_names.add(skill.lower())
        
        # Penalty for too many skills without supporting evidence
        if len(skill_names) > 30:
            score -= 0.3
        elif len(skill_names) > 20:
            score -= 0.1
        
        # Check for supporting evidence in experience and projects
        all_descriptions = ' '.join([
            e.get('description', '') for e in experience
        ] + [
            p.get('description', '') for p in projects
        ])
        
        # Bonus for detailed descriptions
        if len(all_descriptions.split()) > 200:
            score = min(score + 0.1, 1.0)
        
        return max(score, 0.0)
    
    def _detect_keyword_stuffing(self, skills: List) -> bool:
        """
        Detect potential keyword stuffing.
        """
        if not skills:
            return False
        
        # Check for duplicate skills
        skill_names = []
        for skill in skills:
            if isinstance(skill, dict):
                skill_names.append(skill.get('name', '').lower())
            elif isinstance(skill, str):
                skill_names.append(skill.lower())
        
        # Check for duplicates
        if len(skill_names) != len(set(skill_names)):
            return True
        
        # Check for excessive number of skills
        if len(skill_names) > 30:
            return True
        
        return False
    
    def _compute_clarity_structure_score(self, resume_data: Dict) -> float:
        """
        Compute clarity and structure score (0-1).
        Based on completeness and organization of resume data.
        """
        score = 0.0
        
        # Check for required sections (20% each)
        if resume_data.get('skills'):
            score += 0.2
        if resume_data.get('education'):
            score += 0.2
        if resume_data.get('experience'):
            score += 0.2
        if resume_data.get('projects'):
            score += 0.2
        if resume_data.get('certifications'):
            score += 0.2
        
        return score
    
    def _compute_role_alignment_score(self, resume_data: Dict) -> float:
        """
        Compute role alignment consistency score (0-1).
        Based on consistency between skills, experience, and applied role.
        """
        applied_role = resume_data.get('applied_role', '')
        if not applied_role:
            return 0.5  # Default score if no role specified
        
        skills = self._normalize_skills(resume_data.get('skills', []))
        experience = resume_data.get('experience', [])
        
        # Role-specific keywords
        role_keywords = {
            'FRONTEND_DEVELOPER': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'ui', 'ux'],
            'BACKEND_DEVELOPER': ['django', 'flask', 'fastapi', 'node.js', 'express', 'api', 'rest', 'graphql', 'server'],
            'FULLSTACK_DEVELOPER': ['react', 'django', 'flask', 'node.js', 'express', 'fullstack', 'full stack'],
            'DATA_SCIENTIST': ['pandas', 'numpy', 'matplotlib', 'seaborn', 'scikit-learn', 'data analysis', 'statistics'],
            'ML_ENGINEER': ['tensorflow', 'pytorch', 'keras', 'machine learning', 'deep learning', 'neural'],
            'DEVOPS_ENGINEER': ['docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'aws', 'azure', 'gcp'],
            'MOBILE_DEVELOPER': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'mobile'],
        }
        
        keywords = role_keywords.get(applied_role, [])
        if not keywords:
            return 0.5
        
        # Check skill alignment
        skills_lower = [s.lower() for s in skills]
        skill_alignment = sum(1 for kw in keywords if kw in skills_lower) / len(keywords)
        
        # Check experience alignment
        exp_titles = ' '.join([e.get('title', '').lower() for e in experience])
        exp_alignment = sum(1 for kw in keywords if kw in exp_titles) / len(keywords)
        
        return (skill_alignment + exp_alignment) / 2
    
    def _compute_achievement_orientation_score(
        self,
        experience: List[Dict],
        projects: List[Dict]
    ) -> float:
        """
        Compute achievement-oriented bullet points score (0-1).
        Based on use of action verbs and quantifiable achievements.
        """
        achievement_keywords = [
            'achieved', 'delivered', 'completed', 'launched', 'deployed',
            'increased', 'decreased', 'reduced', 'improved', 'optimized',
            'led', 'managed', 'developed', 'created', 'built', 'designed'
        ]
        
        quantifiable_indicators = ['%', 'number', 'count', 'users', 'customers', 'revenue', 'cost']
        
        all_descriptions = ' '.join([
            e.get('description', '') for e in experience
        ] + [
            p.get('description', '') for p in projects
        ])
        
        all_descriptions_lower = all_descriptions.lower()
        
        # Count achievement keywords
        achievement_count = sum(
            1 for kw in achievement_keywords if kw in all_descriptions_lower
        )
        
        # Count quantifiable indicators
        quantifiable_count = sum(
            1 for ind in quantifiable_indicators if ind in all_descriptions_lower
        )
        
        # Calculate score
        achievement_score = min(achievement_count / 5, 1.0) * 0.6
        quantifiable_score = min(quantifiable_count / 3, 1.0) * 0.4
        
        return achievement_score + quantifiable_score
    
    def _compute_technical_clarity_score(
        self,
        skills: List,
        experience: List[Dict],
        projects: List[Dict]
    ) -> float:
        """
        Compute technical clarity score (0-1).
        Based on clear technical descriptions and proper terminology.
        """
        score = 0.0
        
        # Check for clear skill descriptions
        clear_skills = 0
        for skill in skills:
            if isinstance(skill, dict):
                if skill.get('name') and len(skill.get('name', '')) > 2:
                    clear_skills += 1
            elif isinstance(skill, str) and len(skill) > 2:
                clear_skills += 1
        
        skill_clarity = clear_skills / len(skills) if skills else 0.0
        score += skill_clarity * 0.4
        
        # Check for technical terminology in descriptions
        tech_terms = [
            'api', 'database', 'framework', 'library', 'algorithm',
            'architecture', 'deployment', 'integration', 'optimization'
        ]
        
        all_descriptions = ' '.join([
            e.get('description', '') for e in experience
        ] + [
            p.get('description', '') for p in projects
        ])
        
        tech_term_count = sum(
            1 for term in tech_terms if term in all_descriptions.lower()
        )
        
        tech_clarity = min(tech_term_count / 5, 1.0)
        score += tech_clarity * 0.6
        
        return score
    
    def compute_suitability_score(
        self,
        skill_match_percentage: float,
        practical_exposure_score: float,
        education_score: float,
        experience_relevance_score: float,
        resume_quality_score: float
    ) -> float:
        """
        Compute final suitability score (0-100).
        
        Weights:
        - Skill Match (40%)
        - Project Depth (20%)
        - Education Alignment (10%)
        - Experience Relevance (20%)
        - Resume Quality (10%)
        """
        # Convert scores to 0-1 scale if needed
        skill_match = skill_match_percentage / 100
        
        # Weighted sum
        weighted_score = (
            skill_match * 0.40 +
            practical_exposure_score * 0.20 +
            education_score * 0.10 +
            experience_relevance_score * 0.20 +
            resume_quality_score * 0.10
        )
        
        # Convert to 0-100 scale
        return round(weighted_score * 100, 2)
    
    def compute_decision(
        self,
        suitability_score: float,
        critical_skill_gap_count: int,
        skill_match_percentage: float
    ) -> tuple:
        """
        Compute suitability decision and decision flags.
        
        Returns:
            Tuple of (decision, decision_flags)
        """
        decision_flags = []
        
        # Decision logic
        if suitability_score >= 80:
            decision = 'INTERVIEW_SHORTLIST'
            if skill_match_percentage >= 90:
                decision_flags.append('High technical fit')
            if critical_skill_gap_count == 0:
                decision_flags.append('Strong skill coverage')
        elif suitability_score >= 60:
            decision = 'MANUAL_REVIEW'
            if critical_skill_gap_count > 0:
                decision_flags.append(f'Missing {critical_skill_gap_count} critical skill(s)')
            if skill_match_percentage >= 70:
                decision_flags.append('Good technical foundation')
        else:
            decision = 'REJECT'
            if critical_skill_gap_count >= 3:
                decision_flags.append('Missing critical backend fundamentals')
            if skill_match_percentage < 40:
                decision_flags.append('Underqualified')
        
        # Additional flags
        if suitability_score >= 90:
            decision_flags.append('Overqualified')
        
        return decision, decision_flags
