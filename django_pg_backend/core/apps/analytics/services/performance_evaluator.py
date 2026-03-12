"""
Performance Evaluator Service
=============================
This service provides the output layer for the RL system, generating:
1. Performance Status (Thriving / Coping / Struggling / High Risk)
2. Improvement Suggestions
3. Personalized Learning Path

Based on the intern's state vector and task outcomes.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import numpy as np
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User
from apps.analytics.models import (
    TaskTracking, 
    SkillProfile, 
    LearningPath,
    MonthlyEvaluationReport,
    AttendanceRecord
)

logger = logging.getLogger(__name__)


class PerformanceStatus(Enum):
    THRIVING = "Thriving"
    COPING_WELL = "Coping Well"
    STRUGGLING = "Struggling"
    HIGH_RISK = "High Risk"


@dataclass
class PerformanceMetrics:
    """Derived metrics from intern state"""
    quality_score: float
    completion_rate: float
    growth_velocity: float
    engagement: float
    difficulty_handled: float
    dropout_risk: float
    
    def to_dict(self) -> Dict[str, float]:
        return {
            'quality_score': self.quality_score,
            'completion_rate': self.completion_rate,
            'growth_velocity': self.growth_velocity,
            'engagement': self.engagement,
            'difficulty_handled': self.difficulty_handled,
            'dropout_risk': self.dropout_risk
        }


@dataclass
class PerformanceDiagnosis:
    """Diagnosis based on weak metrics"""
    weak_areas: List[str]
    possible_causes: Dict[str, List[str]]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'weak_areas': self.weak_areas,
            'possible_causes': self.possible_causes
        }


class PerformanceEvaluator:
    """
    Performance Evaluation System
    
    Evaluates intern performance and generates:
    - Performance Status Classification
    - Diagnosis based on weak metrics
    - AI Suggestions for Improvement
    - Personalized Learning Path
    """
    
    # Weights for performance score calculation
    WEIGHTS = {
        'quality': 0.25,
        'completion': 0.25,
        'growth': 0.15,
        'engagement': 0.15,
        'difficulty': 0.10,
        'risk_prevention': 0.10
    }
    
    # Performance thresholds
    SCORE_THRESHOLDS = {
        'thriving': 0.75,
        'coping': 0.50,
        'struggling': 0.30
    }
    
    def __init__(self, intern_id: int):
        self.intern_id = intern_id
        self.intern = User.objects.get(id=intern_id)
    
    def get_performance_metrics(self, days: int = 30) -> PerformanceMetrics:
        """
        Calculate performance metrics from intern's recent activity.
        
        Args:
            days: Number of days to look back for metrics calculation
            
        Returns:
            PerformanceMetrics object with all derived metrics
        """
        now = timezone.now()
        start_date = now - timedelta(days=days)
        
        # Get completed tasks in the period
        tasks = TaskTracking.objects.filter(
            intern=self.intern,
            assigned_at__gte=start_date
        )
        
        total_tasks = tasks.count()
        if total_tasks == 0:
            # Return default metrics for new interns
            return PerformanceMetrics(
                quality_score=0.5,
                completion_rate=0.5,
                growth_velocity=0.5,
                engagement=0.5,
                difficulty_handled=1.0,
                dropout_risk=0.0
            )
        
        # Quality Score: Average of quality ratings
        completed_tasks = tasks.filter(status='COMPLETED')
        quality_avg = completed_tasks.aggregate(Avg('quality_rating'))['quality_rating__avg']
        quality_score = (quality_avg / 5.0) if quality_avg else 0.5
        
        # Completion Rate: Completed / Total
        completion_count = completed_tasks.count()
        completion_rate = completion_count / total_tasks
        
        # Growth Velocity: From monthly evaluations
        try:
            evaluations = MonthlyEvaluationReport.objects.filter(
                intern=self.intern,
                evaluation_month__gte=start_date.date()
            ).order_by('evaluation_month')
            
            if evaluations.count() >= 2:
                # Calculate growth from sequential evaluations
                growth_velocity = (evaluations.last().skill_development_progress - 
                                evaluations.first().skill_development_progress) / 100.0
            else:
                # Use overall skill development progress
                latest_eval = evaluations.last()
                growth_velocity = latest_eval.skill_development_progress / 100.0 if latest_eval else 0.5
        except Exception as e:
            # If table doesn't exist or other error, use default
            logger.warning(f"Could not fetch MonthlyEvaluationReport: {e}")
            growth_velocity = 0.5
        
        # Engagement: Based on attendance and task submission patterns
        attendance = AttendanceRecord.objects.filter(
            intern=self.intern,
            date__gte=start_date.date()
        )
        present_days = attendance.filter(status='PRESENT').count()
        total_days = attendance.count()
        engagement = present_days / total_days if total_days > 0 else 0.5
        
        # Difficulty Handled: Average difficulty of completed tasks
        difficulty_values = list(completed_tasks.values_list('priority', flat=True))
        if difficulty_values:
            # Map priority to difficulty (1-5)
            priority_map = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
            difficulties = [priority_map.get(p, 2) for p in difficulty_values]
            difficulty_handled = np.mean(difficulties) / 4.0  # Normalize to 0-1
        else:
            difficulty_handled = 0.5
        
        # Dropout Risk: Based on overdue tasks and engagement
        overdue_tasks = tasks.filter(
            status__in=['ASSIGNED', 'IN_PROGRESS'],
            due_date__lt=now.date()
        ).count()
        
        overdue_ratio = overdue_tasks / total_tasks if total_tasks > 0 else 0
        dropout_risk = min((overdue_ratio * 0.7) + ((1 - engagement) * 0.3), 1.0)
        
        return PerformanceMetrics(
            quality_score=quality_score,
            completion_rate=completion_rate,
            growth_velocity=growth_velocity,
            engagement=engagement,
            difficulty_handled=difficulty_handled,
            dropout_risk=dropout_risk
        )
    
    def calculate_performance_score(self, metrics: PerformanceMetrics) -> float:
        """
        Calculate weighted performance score.
        
        Formula:
        Performance Score = 0.25 * Quality + 0.25 * Completion + 0.15 * Growth 
                          + 0.15 * Engagement + 0.10 * Difficulty + 0.10 * (1 - Risk)
        """
        score = (
            self.WEIGHTS['quality'] * metrics.quality_score +
            self.WEIGHTS['completion'] * metrics.completion_rate +
            self.WEIGHTS['growth'] * metrics.growth_velocity +
            self.WEIGHTS['engagement'] * metrics.engagement +
            self.WEIGHTS['difficulty'] * metrics.difficulty_handled +
            self.WEIGHTS['risk_prevention'] * (1 - metrics.dropout_risk)
        )
        return min(max(score, 0.0), 1.0)  # Clamp to 0-1
    
    def classify_performance(self, score: float) -> PerformanceStatus:
        """Classify performance based on score"""
        if score >= self.SCORE_THRESHOLDS['thriving']:
            return PerformanceStatus.THRIVING
        elif score >= self.SCORE_THRESHOLDS['coping']:
            return PerformanceStatus.COPING_WELL
        elif score >= self.SCORE_THRESHOLDS['struggling']:
            return PerformanceStatus.STRUGGLING
        else:
            return PerformanceStatus.HIGH_RISK
    
    def diagnose_performance(self, metrics: PerformanceMetrics) -> PerformanceDiagnosis:
        """
        Diagnose performance based on weak metrics.
        
        Returns:
            PerformanceDiagnosis with weak areas and possible causes
        """
        weak_areas = []
        possible_causes = {}
        
        # Check each metric and identify weaknesses
        if metrics.completion_rate < 0.6:
            weak_areas.append("Low Task Completion Rate")
            possible_causes["Low Completion Rate"] = [
                "Task difficulty too high",
                "Time management issues",
                "Unclear task requirements",
                "Lack of motivation"
            ]
        
        if metrics.quality_score < 0.5:
            weak_areas.append("Low Code Quality")
            possible_causes["Low Quality Score"] = [
                "Weak conceptual knowledge",
                "Lack of coding best practices",
                "Insufficient code reviews",
                "Rushing to complete tasks"
            ]
        
        if metrics.engagement < 0.6:
            weak_areas.append("Low Engagement")
            possible_causes["Low Engagement"] = [
                "Burnout",
                "Lack of motivation",
                "Personal issues",
                "Uninteresting projects"
            ]
        
        if metrics.growth_velocity < 0.4:
            weak_areas.append("Low Growth Velocity")
            possible_causes["Low Growth Velocity"] = [
                "Repeating similar tasks",
                "Not learning new technologies",
                "Lack of challenging assignments",
                "No clear learning goals"
            ]
        
        if metrics.difficulty_handled < 0.4:
            weak_areas.append("Under-challenging Tasks")
            possible_causes["Under-challenging"] = [
                "Tasks too easy",
                "Not being stretched",
                "Missing growth opportunities"
            ]
        
        if metrics.dropout_risk > 0.5:
            weak_areas.append("High Dropout Risk")
            possible_causes["High Dropout Risk"] = [
                "Multiple overdue tasks",
                "Consistent attendance issues",
                "Declining performance trend"
            ]
        
        return PerformanceDiagnosis(
            weak_areas=weak_areas,
            possible_causes=possible_causes
        )
    
    def generate_suggestions(self, diagnosis: PerformanceDiagnosis, 
                           metrics: PerformanceMetrics) -> List[str]:
        """
        Generate AI suggestions based on diagnosis.
        
        Returns:
            List of actionable improvement suggestions
        """
        suggestions = []
        
        for weak_area in diagnosis.weak_areas:
            if weak_area == "Low Task Completion Rate":
                suggestions.extend([
                    "Assign smaller modular tasks with clear milestones",
                    "Introduce guided tasks with code templates and examples",
                    "Implement pair programming with senior interns",
                    "Set realistic deadlines based on task complexity",
                    "Break down complex tasks into manageable sub-tasks"
                ])
            
            elif weak_area == "Low Code Quality":
                suggestions.extend([
                    "Enforce code review feedback loops",
                    "Assign refactoring tasks to improve code structure",
                    "Introduce coding standard exercises and linters",
                    "Schedule regular 1-on-1 code review sessions",
                    "Provide resources on clean code practices"
                ])
            
            elif weak_area == "Low Engagement":
                suggestions.extend([
                    "Rotate project domains to increase variety",
                    "Add collaborative tasks that require team interaction",
                    "Introduce milestone-based rewards and recognition",
                    "Schedule regular check-ins to discuss career goals",
                    "Assign projects aligned with intern's interests"
                ])
            
            elif weak_area == "Low Growth Velocity":
                suggestions.extend([
                    "Increase task diversity to learn new skills",
                    "Assign SKILL_GAP tasks targeting identified weaknesses",
                    "Add concept-based mini projects for deeper learning",
                    "Provide access to advanced learning resources",
                    "Encourage cross-team collaboration for exposure"
                ])
            
            elif weak_area == "Under-challenging Tasks":
                suggestions.extend([
                    "Gradually increase task difficulty",
                    "Assign stretch goal tasks with mentor support",
                    "Include exploratory research tasks",
                    "Challenge with performance optimization tasks"
                ])
            
            elif weak_area == "High Dropout Risk":
                suggestions.extend([
                    "Schedule immediate mentor check-in",
                    "Review and adjust workload",
                    "Create a success plan with achievable goals",
                    "Provide additional support resources",
                    "Consider project rotation to re-engage"
                ])
        
        # Deduplicate suggestions
        return list(set(suggestions))[:10]  # Return top 10 unique suggestions
    
    def get_recommended_task_type(self, metrics: PerformanceMetrics,
                                 optimal_difficulty: int) -> str:
        """
        Determine the recommended next task type based on performance.
        
        Returns:
            Task type recommendation string
        """
        score = self.calculate_performance_score(metrics)
        
        if score >= self.SCORE_THRESHOLDS['thriving']:
            if optimal_difficulty >= 4:
                return "ADVANCED_TASK"
            else:
                return "CHALLENGING_TASK"
        elif score >= self.SCORE_THRESHOLDS['coping']:
            return "MODERATE_TASK"
        elif score >= self.SCORE_THRESHOLDS['struggling']:
            return "SUPPORTED_TASK"
        else:
            return "EASY_TASK"
    
    def get_learning_path(self, target_role: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the current learning path for the intern.
        
        Args:
            target_role: Optional target job role to generate path
            
        Returns:
            Learning path data including milestones and progress
        """
        try:
            from apps.analytics.services.learning_path_optimizer import get_path_progress
            
            # Try to get existing learning path
            try:
                from apps.analytics.models import LearningPath
                learning_path = LearningPath.objects.filter(
                    intern=self.intern
                ).order_by('-created_at').first()
                
                if learning_path:
                    # Get progress from the optimizer service
                    progress = get_path_progress(self.intern_id)
                    return {
                        'has_path': True,
                        'target_role': learning_path.job_role.role_title if learning_path.job_role else learning_path.target_role_title,
                        'milestones': learning_path.milestones,
                        'current_position': learning_path.current_position,
                        'progress': progress
                    }
            except Exception as e:
                logger.warning(f"Could not fetch LearningPath: {e}")
            
            # Generate new path if target_role provided
            if target_role:
                try:
                    from apps.analytics.services.learning_path_optimizer import generate_and_save_path
                    path_data = generate_and_save_path(self.intern_id, target_role)
                    return {
                        'has_path': True,
                        'target_role': target_role,
                        'milestones': path_data.get('milestones', []),
                        'current_position': 0,
                        'progress': path_data.get('progress', {})
                    }
                except Exception as e:
                    logger.warning(f"Could not generate learning path: {e}")
                    return {
                        'has_path': False,
                        'message': f'Learning path not available. Error: {str(e)}'
                    }
            
            return {
                'has_path': False,
                'message': 'No learning path found. Generate one with a target role.'
            }
        except Exception as e:
            logger.warning(f"Error in get_learning_path: {e}")
            return {
                'has_path': False,
                'message': 'Learning path service unavailable.'
            }
    
    def evaluate(self, target_role: Optional[str] = None) -> Dict[str, Any]:
        """
        Main evaluation method that produces all three outputs:
        1. Performance Status
        2. Improvement Suggestions
        3. Personalized Learning Path
        
        Args:
            target_role: Optional target job role for learning path
            
        Returns:
            Comprehensive evaluation result dictionary
        """
        # 1. Get performance metrics
        metrics = self.get_performance_metrics()
        
        # 2. Calculate performance score
        performance_score = self.calculate_performance_score(metrics)
        
        # 3. Classify performance status
        status = self.classify_performance(performance_score)
        
        # 4. Diagnose performance issues
        diagnosis = self.diagnose_performance(metrics)
        
        # 5. Generate suggestions
        suggestions = self.generate_suggestions(diagnosis, metrics)
        
        # 6. Get recommended task type
        from apps.analytics.services.rl_task_assigner import get_optimal_difficulty
        optimal_difficulty = get_optimal_difficulty(self.intern_id)
        recommended_task_type = self.get_recommended_task_type(metrics, optimal_difficulty)
        
        # 7. Get learning path
        learning_path = self.get_learning_path(target_role)
        
        # 8. Build reasoning
        reasoning = self._build_reasoning(metrics, status)
        
        return {
            'intern_id': self.intern_id,
            'intern_name': self.intern.full_name,
            'intern_email': self.intern.email,
            
            # Performance Status
            'performance_status': status.value,
            'performance_score': round(performance_score, 2),
            'reasoning': reasoning,
            
            # Performance Metrics
            'metrics': metrics.to_dict(),
            
            # Diagnosis
            'diagnosis': diagnosis.to_dict(),
            
            # Suggestions
            'recommendations': suggestions,
            
            # Learning Path
            'learning_path': learning_path,
            
            # Task Recommendation
            'next_task_type': recommended_task_type,
            'optimal_difficulty': optimal_difficulty,
            
            # Metadata
            'evaluated_at': timezone.now().isoformat()
        }
    
    def _build_reasoning(self, metrics: PerformanceMetrics, 
                        status: PerformanceStatus) -> str:
        """Build human-readable reasoning for the performance status"""
        parts = []
        
        if metrics.completion_rate >= 0.8:
            parts.append(f"Completion rate is strong ({int(metrics.completion_rate*100)}%)")
        elif metrics.completion_rate >= 0.6:
            parts.append(f"Completion rate is moderate ({int(metrics.completion_rate*100)}%)")
        else:
            parts.append(f"Completion rate needs improvement ({int(metrics.completion_rate*100)}%)")
        
        if metrics.quality_score >= 0.7:
            parts.append("Quality score is good")
        elif metrics.quality_score >= 0.5:
            parts.append("Quality score is acceptable")
        else:
            parts.append("Code quality needs attention")
        
        if metrics.growth_velocity >= 0.6:
            parts.append("Growth velocity is excellent")
        elif metrics.growth_velocity >= 0.4:
            parts.append("Growth is steady")
        else:
            parts.append("Growth could be faster")
        
        if metrics.engagement >= 0.7:
            parts.append("Engagement is high")
        elif metrics.engagement >= 0.5:
            parts.append("Engagement is moderate")
        else:
            parts.append("Engagement is below average")
        
        return ". ".join(parts) + "."


def evaluate_intern_performance(intern_id: int, 
                                target_role: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to evaluate intern performance.
    
    Args:
        intern_id: ID of the intern to evaluate
        target_role: Optional target job role for learning path
        
    Returns:
        Comprehensive evaluation result
    """
    evaluator = PerformanceEvaluator(intern_id)
    return evaluator.evaluate(target_role)


def get_performance_status(intern_id: int) -> Dict[str, Any]:
    """
    Quick performance status check.
    
    Returns:
        Status and score only
    """
    evaluator = PerformanceEvaluator(intern_id)
    metrics = evaluator.get_performance_metrics()
    score = evaluator.calculate_performance_score(metrics)
    status = evaluator.classify_performance(score)
    
    return {
        'intern_id': intern_id,
        'status': status.value,
        'score': round(score, 2),
        'metrics': metrics.to_dict()
    }


def get_improvement_suggestions(intern_id: int) -> Dict[str, Any]:
    """
    Get improvement suggestions for an intern.
    
    Returns:
        Diagnosis and recommendations
    """
    evaluator = PerformanceEvaluator(intern_id)
    metrics = evaluator.get_performance_metrics()
    diagnosis = evaluator.diagnose_performance(metrics)
    suggestions = evaluator.generate_suggestions(diagnosis, metrics)
    
    return {
        'intern_id': intern_id,
        'diagnosis': diagnosis.to_dict(),
        'suggestions': suggestions,
        'metrics': metrics.to_dict()
    }
