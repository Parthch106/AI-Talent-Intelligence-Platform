from typing import List, Dict, Any
from .config import SKILL_CATEGORIES, OVERALL_SCORE_WEIGHTS, TECHNICAL_KEYWORDS, LEADERSHIP_KEYWORDS

class ScoringService:
    @staticmethod
    def compute_skill_diversity(skills: List[str]) -> float:
        """Compute skill diversity score (0-1)."""
        if not skills: return 0.0
        skills_lower = [s.lower() for s in skills]
        categories_covered = set()
        for category, category_skills in SKILL_CATEGORIES.items():
            if any(s in category_skills for s in skills_lower):
                categories_covered.add(category)
        diversity = len(categories_covered) / len(SKILL_CATEGORIES)
        bonus = min(len(skills) / 20, 1.0) * 0.2
        return min(diversity + bonus, 1.0)

    @staticmethod
    def compute_experience_depth(experience: List[Dict], total_years: float) -> float:
        """Compute experience depth score (0-1)."""
        if not experience: return 0.0
        score = min(total_years / 10, 1.0) * 0.4
        score += min(len(experience) / 5, 1.0) * 0.2
        seniority_scores = []
        for exp in experience:
            title = exp.get('title', '').lower()
            val = 0
            for kw, s in [('intern', 0.2), ('junior', 0.4), ('developer', 0.5), ('engineer', 0.5), ('senior', 0.7), ('lead', 0.8), ('manager', 0.9), ('director', 1.0)]:
                if kw in title: val = s
            seniority_scores.append(val)
        if seniority_scores and len(seniority_scores) > 1:
            score += (max(seniority_scores) - min(seniority_scores)) * 0.4
        return min(score, 1.0)

    @staticmethod
    def compute_technical_ratio(skills: List[str], tools: List[str]) -> float:
        """Compute technical vs non-technical ratio (0-1)."""
        all_items = skills + tools
        if not all_items: return 0.0
        all_items_lower = [s.lower() for s in all_items]
        technical_count = sum(1 for item in all_items_lower if any(tech in item for tech in TECHNICAL_KEYWORDS))
        return technical_count / len(all_items)

    @staticmethod
    def compute_leadership_indicator(experience: List[Dict]) -> float:
        """Compute leadership indicator score (0-1)."""
        if not experience: return 0.0
        leadership_count = sum(1 for exp in experience if any(kw in exp.get('title', '').lower() for kw in LEADERSHIP_KEYWORDS))
        return leadership_count / len(experience)

    @staticmethod
    def compute_overall_score(features: Dict[str, Any]) -> float:
        """Compute overall AI-readiness score (0-1)."""
        score = sum(features.get(metric, 0.0) * weight for metric, weight in OVERALL_SCORE_WEIGHTS.items())
        return round(score, 4)
