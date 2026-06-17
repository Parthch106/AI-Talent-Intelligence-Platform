from typing import List, Dict, Any
from .config import DOMAIN_KEYWORDS

class AnalysisService:
    @staticmethod
    def compute_domain_relevance(skills: List[str], required_domains: List[str], experience: List[Dict] = None, projects: List[Dict] = None) -> float:
        """Compute domain relevance score (0-1)."""
        if not required_domains: return 0.5
        all_text = ' '.join([(e.get('title', '') + ' ' + e.get('description', '')) for e in (experience or [])] + [(p.get('title', '') + ' ' + p.get('description', '')) for p in (projects or [])]).lower()
        if any((d.lower() in all_text or any(kw in all_text for kw in DOMAIN_KEYWORDS.get(d.lower(), []))) for d in required_domains):
            return 1.0
        domain_scores = {d: (min(sum(1 for kw in DOMAIN_KEYWORDS.get(d.lower(), []) if any(kw in s for s in skills)) / len(DOMAIN_KEYWORDS.get(d.lower(), [])), 1.0) if DOMAIN_KEYWORDS.get(d.lower(), []) else 0.0) for d in required_domains}
        return sum(domain_scores.values()) / len(domain_scores) if domain_scores else 0.5

    @staticmethod
    def compute_skill_to_role_match(skills: List[str], tools: List[str], role_requirements: Dict[str, Any], experience: List[Dict] = None, projects: List[Dict] = None) -> Dict[str, Any]:
        """Compute skill-to-role matching metrics."""
        all_skills_lower = [s.lower() for s in (skills + tools)]
        required_lower = [s.lower() for s in role_requirements.get('required_core_skills', [])]
        preferred_lower = [s.lower() for s in role_requirements.get('preferred_skills', [])]
        
        matched_required = sum(1 for s in required_lower if s in all_skills_lower)
        total_required = len(required_lower)
        tolerance = max(total_required * 0.25, 1)
        critical_gap = max(0, int(total_required - matched_required - tolerance))
        effective_match = min(matched_required / max(total_required - tolerance, 1), 1.0) if total_required > 0 else 1.0
        
        matched_preferred = sum(1 for s in preferred_lower if s in all_skills_lower)
        total_preferred = len(preferred_lower)
        
        domain_relevance = AnalysisService.compute_domain_relevance(all_skills_lower, role_requirements.get('required_domains', []), experience, projects)
        
        return {
            'skill_match_percentage': round(effective_match * 100, 2),
            'core_skill_match_score': round(matched_required / total_required if total_required > 0 else 0.0, 4),
            'optional_skill_bonus_score': round(matched_preferred / total_preferred if total_preferred > 0 else 0.0, 4),
            'critical_skill_gap_count': critical_gap,
            'missing_critical_skills': [s for s in role_requirements.get('required_core_skills', []) if s.lower() not in all_skills_lower],
            'domain_relevance_score': round(domain_relevance, 4),
        }
