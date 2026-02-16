"""
PHASE 4: Final Suitability Scoring Logic
=======================================

This module implements the final suitability scoring logic:
1. Threshold-based decision logic
2. Confidence scoring
3. Feature importance breakdown
4. Bias monitoring flags

Author: AI Talent Intelligence Platform
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple


class SuitabilityScorer:
    """
    Final Suitability Scoring Engine.
    
    Implements:
    - Threshold-based decision logic
    - Confidence scoring
    - Feature importance breakdown
    - Bias monitoring
    """
    
    # Decision thresholds (configurable)
    DEFAULT_THRESHOLDS = {
        'INTERVIEW_SHORTLIST': 0.75,
        'TECHNICAL_ASSIGNMENT': 0.60,
        'MANUAL_REVIEW': 0.50,
    }
    
    def __init__(self, thresholds: Optional[Dict[str, float]] = None):
        self.thresholds = thresholds or self.DEFAULT_THRESHOLDS
    
    # =========================================================================
    # FINAL SUITABILITY SCORING
    # =========================================================================
    
    def compute_final_suitability(
        self,
        ml_predictions: Dict[str, float],
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Compute final suitability score and decision.
        
        Args:
            ml_predictions: ML model predictions
            features: Input features
            
        Returns:
            Final suitability result with decision
        """
        result = {}
        
        # 1. Get base suitability score from ML model
        base_suitability = ml_predictions.get('suitability_score', 0.5)
        
        # 2. Apply adjustments based on quality indicators
        adjusted_suitability = self._apply_adjustments(
            base_suitability,
            ml_predictions,
            features
        )
        
        # 3. Ensure bounds
        final_score = min(max(adjusted_suitability, 0.0), 1.0)
        
        # 4. Determine decision
        decision = self._determine_decision(final_score)
        
        # 5. Compute confidence
        confidence = self._compute_confidence(ml_predictions, final_score)
        
        # 6. Get feature importance
        feature_importance = self._compute_feature_importance(
            ml_predictions,
            features
        )
        
        result['suitability_score'] = round(final_score, 2)
        result['decision'] = decision
        result['confidence_score'] = round(confidence, 2)
        result['feature_importance'] = feature_importance
        
        return result
    
    def _apply_adjustments(
        self,
        base_score: float,
        ml_predictions: Dict[str, float],
        features: Dict[str, float]
    ) -> float:
        """
        Apply adjustments to base score based on quality indicators.
        
        Args:
            base_score: ML model base score
            ml_predictions: All ML predictions
            features: Input features
            
        Returns:
            Adjusted score
        """
        adjustment = 0.0
        
        # Authenticity bonus/penalty
        authenticity = ml_predictions.get('resume_authenticity_score', 0.5)
        if authenticity < 0.4:
            adjustment -= 0.15  # Strong penalty for suspicious resumes
        elif authenticity > 0.8:
            adjustment += 0.05  # Bonus for highly authentic
            
        # Critical skill gaps penalty
        critical_gaps = features.get('critical_skill_gap_count', 0)
        if critical_gaps > 2:
            adjustment -= 0.10
        elif critical_gaps > 0:
            adjustment -= 0.05 * critical_gaps
            
        # Skill match bonus
        skill_match = features.get('skill_match_ratio', 0)
        if skill_match > 0.8:
            adjustment += 0.05
        elif skill_match < 0.4:
            adjustment -= 0.05
            
        # Production tools bonus
        prod_tools = features.get('production_tools_usage_score', 0)
        if prod_tools > 0.6:
            adjustment += 0.03
            
        return base_score + adjustment
    
    def _determine_decision(self, suitability_score: float) -> str:
        """
        Determine decision based on thresholds.
        
        Args:
            suitability_score: Final suitability score
            
        Returns:
            Decision string
        """
        if suitability_score >= self.thresholds['INTERVIEW_SHORTLIST']:
            return 'INTERVIEW_SHORTLIST'
        elif suitability_score >= self.thresholds['TECHNICAL_ASSIGNMENT']:
            return 'TECHNICAL_ASSIGNMENT'
        elif suitability_score >= self.thresholds['MANUAL_REVIEW']:
            return 'MANUAL_REVIEW'
        else:
            return 'REJECT'
    
    def _compute_confidence(
        self,
        ml_predictions: Dict[str, float],
        final_score: float
    ) -> float:
        """
        Compute confidence score based on model agreement.
        
        Args:
            ml_predictions: All ML predictions
            final_score: Final suitability score
            
        Returns:
            Confidence score (0-1)
        """
        # Get individual scores
        scores = [
            ml_predictions.get('suitability_score', 0.5),
            ml_predictions.get('technical_competency_score', 0.5),
            ml_predictions.get('growth_potential_score', 0.5),
            ml_predictions.get('resume_authenticity_score', 0.5),
        ]
        
        # Calculate variance
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        
        # Base confidence from variance
        confidence = 1.0 - min(variance * 2, 0.4)
        
        # Boost confidence if score is extreme (clear decision)
        if final_score > 0.8 or final_score < 0.2:
            confidence = min(confidence + 0.1, 0.95)
            
        # Reduce confidence if scores are mixed
        max_diff = max(scores) - min(scores)
        if max_diff > 0.4:
            confidence = max(confidence - 0.15, 0.3)
            
        return max(0.3, min(confidence, 0.95))
    
    def _compute_feature_importance(
        self,
        ml_predictions: Dict[str, float],
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Compute feature importance breakdown.
        
        Returns:
            Feature importance with positive/negative contributors
        """
        # Define positive contributors
        positive_features = [
            ('High skill match ratio', features.get('skill_match_ratio', 0) * 0.10),
            ('Strong technical competency', ml_predictions.get('technical_competency_score', 0) * 0.08),
            ('Good growth potential', ml_predictions.get('growth_potential_score', 0) * 0.06),
            ('High authenticity', ml_predictions.get('resume_authenticity_score', 0) * 0.05),
            ('Production experience', features.get('production_tools_usage_score', 0) * 0.04),
            ('Relevant internship', features.get('internship_relevance_score', 0) * 0.04),
        ]
        
        # Define negative contributors
        negative_features = [
            ('Critical skill gaps', features.get('critical_skill_gap_count', 0) * -0.05),
            ('Resume inflation detected', features.get('inflation_score', 0) * -0.04),
            ('Low skill match', (1 - features.get('skill_match_ratio', 0)) * -0.03),
            ('No production tools', (1 - features.get('production_tools_usage_score', 0)) * -0.02),
        ]
        
        # Sort by contribution
        positive = sorted(
            [(k, round(v, 3)) for k, v in positive_features if v > 0.01],
            key=lambda x: x[1],
            reverse=True
        )[:3]  # Top 3
        
        negative = sorted(
            [(k, round(v, 3)) for k, v in negative_features if v < -0.01],
            key=lambda x: x[1]
        )[:3]  # Top 3 (most negative)
        
        return {
            'top_positive_contributors': [k for k, v in positive],
            'top_negative_contributors': [k for k, v in negative],
            'positive_impact': round(sum(v for _, v in positive), 3),
            'negative_impact': round(sum(v for _, v in negative), 3),
        }
    
    # =========================================================================
    # BIAS MONITORING
    # =========================================================================
    
    def get_bias_flags(
        self,
        features: Dict[str, float],
        ml_predictions: Dict[str, float]
    ) -> List[str]:
        """
        Get bias monitoring flags.
        
        Args:
            features: Input features
            ml_predictions: ML predictions
            
        Returns:
            List of bias flags
        """
        flags = []
        
        # Education bias check
        if features.get('university_tier_score', 0) > 0.8:
            flags.append('EDUCATION_BIAS: High-tier university')
            
        # GPA bias check
        if features.get('gpa_normalized', 0) > 0.9:
            flags.append('GPA_BIAS: Extremely high GPA')
            
        # Freshness bias (preferring freshers or experienced)
        exp_months = features.get('experience_duration_months', 0)
        if exp_months > 24:  # More than 2 years
            flags.append('EXPERIENCE_BIAS: High experience')
        elif exp_months == 0:
            flags.append('FRESHER_BIAS: No experience')
            
        # Skill inflation check
        if features.get('inflation_score', 0) > 0.4:
            flags.append('INFLATION_DETECTED')
            
        # Low confidence
        confidence = ml_predictions.get('confidence_score', 0.5)
        if confidence < 0.4:
            flags.append('LOW_CONFIDENCE: Model uncertain')
            
        return flags
    
    # =========================================================================
    # THRESHOLD CALIBRATION
    # =========================================================================
    
    def calibrate_thresholds(
        self,
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Calibrate thresholds based on historical data.
        
        Args:
            historical_data: List of {suitability_score, actual_outcome}
            
        Returns:
            Calibrated thresholds
        """
        # Placeholder for threshold calibration
        # In production, use ROC curve analysis
        
        return self.thresholds
    
    def optimize_thresholds(
        self,
        precision_target: float = 0.85,
        recall_target: float = 0.80
    ) -> Dict[str, float]:
        """
        Optimize thresholds for precision/recall trade-off.
        
        Args:
            precision_target: Target precision
            recall_target: Target recall
            
        Returns:
            Optimized thresholds
        """
        # Placeholder for threshold optimization
        # In production, use cross-validation
        
        optimized = {
            'INTERVIEW_SHORTLIST': 0.75,
            'TECHNICAL_ASSIGNMENT': 0.60,
            'MANUAL_REVIEW': 0.50,
        }
        
        return optimized


# Singleton instance
suitability_scorer = SuitabilityScorer()


# =========================================================================
# DECISION INTERPRETATION
# =========================================================================

def get_decision_explanation(decision: str) -> Dict[str, str]:
    """
    Get human-readable explanation for decision.
    
    Args:
        decision: Decision string
        
    Returns:
        Explanation dictionary
    """
    explanations = {
        'INTERVIEW_SHORTLIST': {
            'action': 'Proceed to interview',
            'reason': 'High suitability score indicates strong fit',
            'next_steps': 'Schedule technical interview'
        },
        'TECHNICAL_ASSIGNMENT': {
            'action': 'Send technical assessment',
            'reason': 'Moderate suitability - need practical evaluation',
            'next_steps': 'Send coding challenge or technical test'
        },
        'MANUAL_REVIEW': {
            'action': 'Flag for human review',
            'reason': 'Mixed signals - requires human judgment',
            'next_steps': 'HR to review and decide'
        },
        'REJECT': {
            'action': 'Reject application',
            'reason': 'Low suitability score indicates poor fit',
            'next_steps': 'Send rejection email with feedback'
        }
    }
    
    return explanations.get(decision, {
        'action': 'Unknown',
        'reason': 'Decision unclear',
        'next_steps': 'Manual review required'
    })
