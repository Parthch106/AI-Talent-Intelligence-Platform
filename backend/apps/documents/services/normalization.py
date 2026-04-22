from typing import List, Any, Dict
from collections import Counter
from .config import SKILL_CATEGORIES, SKILL_IDF_WEIGHTS

class NormalizationService:
    @staticmethod
    def normalize_skills(skills: List[Any]) -> List[str]:
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
                normalized.append(skill_name)
        return normalized

    @staticmethod
    def compute_skill_vector(skills: List[str]) -> Dict[str, int]:
        """Create binary encoding of skills."""
        all_known_skills = set()
        for category_skills in SKILL_CATEGORIES.values():
            all_known_skills.update(category_skills)
        
        skills_lower = [s.lower() for s in skills]
        vector = {skill: 1 if skill.lower() in skills_lower else 0 for skill in all_known_skills}
        
        for skill in skills:
            skill_lower = skill.lower()
            if skill_lower not in vector:
                vector[skill_lower] = 1
        return vector

    @staticmethod
    def compute_skill_frequency(skills: List[str]) -> Dict[str, float]:
        """Compute frequency score for each skill."""
        skill_counts = Counter([s.lower() for s in skills])
        max_count = max(skill_counts.values()) if skill_counts else 1
        return {skill: count / max_count for skill, count in skill_counts.items()}

    @staticmethod
    def compute_tfidf_embedding(skills: List[str]) -> Dict[str, float]:
        """Compute TF-IDF-like embedding for skills."""
        tfidf = {}
        skills_lower = [s.lower() for s in skills]
        for skill in skills_lower:
            tf = 1.0
            idf = SKILL_IDF_WEIGHTS.get(skill, 0.7)
            tfidf[skill] = tf * idf
        return tfidf
