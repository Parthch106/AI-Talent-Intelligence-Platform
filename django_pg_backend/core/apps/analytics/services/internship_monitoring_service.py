"""
Internship Monitoring Service
Computes performance metrics, dropout risk, and full-time suitability
for Phase 2 - Part 2: During Internship Evaluation
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import Counter

from django.db.models import Avg, Count, Q, F
from django.contrib.auth import get_user_model

from apps.analytics.models import (
    TaskTracking,
    AttendanceRecord,
    WeeklyReport,
    PerformanceMetrics,
    MonthlyEvaluationReport,
)
from apps.projects.models import Project

logger = logging.getLogger(__name__)
User = get_user_model()


class InternshipMonitoringService:
    """
    Service for monitoring intern performance during internship.
    Computes productivity, quality, growth, engagement, and risk metrics.
    """
    
    # Dropout risk thresholds
    DROPOUT_RISK_THRESHOLDS = {
        'task_completion_rate': 0.5,
        'attendance_rate': 0.7,
        'engagement_score': 0.4,
        'quality_score': 0.4,
        'consecutive_weeks_low': 2,
    }
    
    # PPO readiness thresholds
    PPO_THRESHOLDS = {
        'productivity_score': 80,
        'quality_score': 80,
        'engagement_score': 75,
        'growth_score': 70,
        'min_weeks': 8,
    }
    
    def __init__(self):
        pass
    
    def compute_weekly_metrics(self, intern_id: int, week_start: datetime, week_end: datetime) -> Optional[Dict]:
        """
        Compute weekly performance metrics for an intern.
        
        Args:
            intern_id: ID of the intern
            week_start: Start date of the week
            week_end: End date of the week
            
        Returns:
            Dictionary containing computed metrics
        """
        try:
            intern = User.objects.get(id=intern_id)
        except User.DoesNotExist:
            logger.error(f"User with ID {intern_id} not found")
            return None
        
        # Get tasks for the week
        tasks = TaskTracking.objects.filter(
            intern=intern,
            assigned_at__date__gte=week_start.date(),
            assigned_at__date__lte=week_end.date()
        )
        
        # Get attendance for the week
        attendance = AttendanceRecord.objects.filter(
            intern=intern,
            date__gte=week_start.date(),
            date__lte=week_end.date()
        )
        
        # Get weekly report
        weekly_report = WeeklyReport.objects.filter(
            intern=intern,
            week_start_date=week_start.date()
        ).first()
        
        # Compute metrics
        metrics = {
            'intern': intern_id,
            'period_start': week_start.date(),
            'period_end': week_end.date(),
            'period_type': 'WEEKLY',
        }
        
        # Productivity Index
        metrics.update(self._compute_productivity_metrics(tasks))
        
        # Quality Score
        metrics.update(self._compute_quality_metrics(tasks))
        
        # Engagement & Commitment
        metrics.update(self._compute_engagement_metrics(attendance, weekly_report))
        
        # Learning & Growth (placeholder for weekly)
        metrics.update(self._compute_growth_metrics(tasks))
        
        # Behavioral & Sentiment Analysis
        metrics.update(self._compute_sentiment_metrics(weekly_report))
        
        # Dropout Risk Assessment
        metrics.update(self._compute_dropout_risk(metrics))
        
        # Full-Time Suitability Prediction
        metrics.update(self._compute_full_time_suitability(metrics, intern))
        
        # Overall Score
        metrics['overall_performance_score'] = self._compute_overall_score(metrics)
        
        # Skill Gap Analysis
        metrics['skill_gaps'] = self._identify_skill_gaps(tasks)
        metrics['recommended_actions'] = self._generate_recommendations(metrics)
        
        # Save to database
        performance_metrics = PerformanceMetrics.objects.update_or_create(
            intern=intern,
            period_start=week_start.date(),
            period_type='WEEKLY',
            defaults=metrics
        )
        
        logger.info(f"Computed weekly metrics for {intern.email}: overall={metrics['overall_performance_score']}")
        
        return metrics
    
    def compute_monthly_metrics(self, intern_id: int, month_start: datetime) -> Optional[Dict]:
        """
        Compute monthly performance metrics and generate evaluation report.
        
        Args:
            intern_id: ID of the intern
            month_start: First day of the month
            
        Returns:
            Dictionary containing computed metrics and evaluation report
        """
        try:
            intern = User.objects.get(id=intern_id)
        except User.DoesNotExist:
            logger.error(f"User with ID {intern_id} not found")
            return None
        
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        # Get all weekly metrics for the month
        weekly_metrics = PerformanceMetrics.objects.filter(
            intern=intern,
            period_start__gte=month_start.date(),
            period_start__lte=month_end.date(),
            period_type='WEEKLY'
        )
        
        if not weekly_metrics.exists():
            logger.warning(f"No weekly metrics found for {intern.email} in {month_start.date()}")
            return None
        
        # Aggregate weekly metrics
        agg_data = weekly_metrics.aggregate(
            avg_productivity=Avg('productivity_score'),
            avg_quality=Avg('quality_score'),
            avg_growth=Avg('growth_score'),
            avg_engagement=Avg('engagement_score'),
            avg_sentiment=Avg('mentor_sentiment_score'),
            total_tasks_completed=Sum('tasks_completed'),
            total_tasks_assigned=Sum('tasks_assigned'),
        )
        
        # Get attendance for the month
        attendance = AttendanceRecord.objects.filter(
            intern=intern,
            date__gte=month_start.date(),
            date__lte=month_end.date()
        )
        
        # Get weekly reports
        weekly_reports = WeeklyReport.objects.filter(
            intern=intern,
            week_start_date__gte=month_start.date(),
            week_start_date__lte=month_end.date()
        )
        
        # Compute aggregated metrics
        metrics = {
            'intern': intern_id,
            'period_start': month_start.date(),
            'period_end': month_end.date(),
            'period_type': 'MONTHLY',
        }
        
        # Productivity (average of weekly)
        metrics['productivity_score'] = agg_data['avg_productivity'] or 0.0
        metrics['tasks_completed'] = agg_data['total_tasks_completed'] or 0
        metrics['tasks_assigned'] = agg_data['total_tasks_assigned'] or 0
        if metrics['tasks_assigned'] > 0:
            metrics['task_completion_rate'] = metrics['tasks_completed'] / metrics['tasks_assigned']
        else:
            metrics['task_completion_rate'] = 0.0
        
        # Quality
        metrics['quality_score'] = agg_data['avg_quality'] or 0.0
        
        # Growth
        metrics['growth_score'] = agg_data['avg_growth'] or 0.0
        metrics['skill_improvement_trend'] = self._compute_growth_trend(weekly_metrics)
        
        # Engagement
        metrics['engagement_score'] = agg_data['avg_engagement'] or 0.0
        if attendance.exists():
            present_days = attendance.filter(status='PRESENT').count()
            total_days = attendance.count()
            metrics['attendance_rate'] = present_days / total_days if total_days > 0 else 0.0
        else:
            metrics['attendance_rate'] = 0.0
        
        # Sentiment
        metrics['mentor_sentiment_score'] = agg_data['avg_sentiment'] or 0.0
        
        # Dropout Risk
        metrics.update(self._compute_dropout_risk(metrics))
        
        # Full-Time Suitability
        metrics.update(self._compute_full_time_suitability(metrics, intern))
        
        # Overall Score
        metrics['overall_performance_score'] = self._compute_overall_score(metrics)
        
        # Skill Gaps and Recommendations
        metrics['skill_gaps'] = self._identify_skill_gaps_from_weekly(weekly_metrics)
        metrics['recommended_actions'] = self._generate_monthly_recommendations(metrics)
        
        # Save monthly metrics
        PerformanceMetrics.objects.update_or_create(
            intern=intern,
            period_start=month_start.date(),
            period_type='MONTHLY',
            defaults=metrics
        )
        
        # Generate monthly evaluation report
        evaluation_report = self._generate_monthly_report(intern, metrics, monthly_report=month_start)
        
        logger.info(f"Computed monthly metrics for {intern.email}: overall={metrics['overall_performance_score']}")
        
        return {
            'metrics': metrics,
            'evaluation_report': evaluation_report,
        }
    
    def _compute_productivity_metrics(self, tasks) -> Dict[str, Any]:
        """Compute productivity index from task data."""
        tasks_list = list(tasks)
        
        if not tasks_list:
            return {
                'productivity_score': 0.0,
                'tasks_completed': 0,
                'tasks_assigned': 0,
                'task_completion_rate': 0.0,
                'deadline_adherence': 0.0,
                'delay_ratio': 0.0,
            }
        
        tasks_assigned = len(tasks_list)
        tasks_completed = sum(1 for t in tasks_list if t.status == 'COMPLETED')
        tasks_on_time = sum(
            1 for t in tasks_list
            if t.status == 'COMPLETED' and t.completed_at and t.completed_at <= t.due_date
        )
        tasks_delayed = sum(
            1 for t in tasks_list
            if t.status == 'COMPLETED' and t.completed_at and t.completed_at > t.due_date
        )
        
        # Completion Rate
        completion_rate = tasks_completed / tasks_assigned if tasks_assigned > 0 else 0.0
        
        # Deadline Adherence
        deadline_adherence = tasks_on_time / tasks_completed if tasks_completed > 0 else 0.0
        
        # Delay Ratio
        delay_ratio = tasks_delayed / tasks_completed if tasks_completed > 0 else 0.0
        
        # Productivity Score (weighted)
        productivity_score = (
            completion_rate * 0.4 +
            deadline_adherence * 0.4 +
            (1 - delay_ratio) * 0.2
        ) * 100
        
        return {
            'productivity_score': round(productivity_score, 2),
            'tasks_completed': tasks_completed,
            'tasks_assigned': tasks_assigned,
            'task_completion_rate': round(completion_rate, 4),
            'deadline_adherence': round(deadline_adherence, 4),
            'delay_ratio': round(delay_ratio, 4),
        }
    
    def _compute_quality_metrics(self, tasks) -> Dict[str, Any]:
        """Compute quality score from task data."""
        tasks_list = list(tasks)
        
        if not tasks_list:
            return {
                'quality_score': 0.0,
                'avg_quality_rating': 0.0,
                'avg_code_review_score': 0.0,
                'bug_frequency': 0.0,
                'rework_percentage': 0.0,
            }
        
        # Get completed tasks with ratings
        completed_tasks = [t for t in tasks_list if t.status == 'COMPLETED']
        
        # Average Quality Rating
        rated_tasks = [t for t in completed_tasks if t.quality_rating is not None]
        avg_quality_rating = (
            sum(t.quality_rating for t in rated_tasks) / len(rated_tasks)
            if rated_tasks else 0.0
        )
        
        # Average Code Review Score
        reviewed_tasks = [t for t in completed_tasks if t.code_review_score is not None]
        avg_code_review_score = (
            sum(t.code_review_score for t in reviewed_tasks) / len(reviewed_tasks)
            if reviewed_tasks else 0.0
        )
        
        # Bug Frequency
        total_bugs = sum(t.bug_count for t in completed_tasks)
        bug_frequency = total_bugs / len(completed_tasks) if completed_tasks else 0.0
        
        # Rework Percentage
        rework_tasks = sum(1 for t in completed_tasks if t.rework_required)
        rework_percentage = rework_tasks / len(completed_tasks) if completed_tasks else 0.0
        
        # Quality Score (weighted)
        quality_score = (
            (avg_quality_rating / 5) * 0.3 if avg_quality_rating > 0 else 0.5 * 0.3 +
            (avg_code_review_score / 100) * 0.3 if avg_code_review_score > 0 else 0.5 * 0.3 +
            (1 - bug_frequency / 5) * 0.2 +
            (1 - rework_percentage) * 0.2
        ) * 100
        
        return {
            'quality_score': round(quality_score, 2),
            'avg_quality_rating': round(avg_quality_rating, 2),
            'avg_code_review_score': round(avg_code_review_score, 2),
            'bug_frequency': round(bug_frequency, 2),
            'rework_percentage': round(rework_percentage, 4),
        }
    
    def _compute_engagement_metrics(self, attendance, weekly_report) -> Dict[str, Any]:
        """Compute engagement and commitment score."""
        if not attendance.exists():
            return {
                'engagement_score': 0.0,
                'attendance_rate': 0.0,
                'meeting_participation': 0.0,
                'report_submission_rate': 0.0,
                'communication_responsiveness': 0.0,
            }
        
        # Attendance Rate
        present_count = attendance.filter(status='PRESENT').count()
        total_count = attendance.count()
        attendance_rate = present_count / total_count if total_count > 0 else 0.0
        
        # Meeting Participation (placeholder)
        meeting_participation = 0.8  # Would be computed from meeting attendance data
        
        # Report Submission Rate
        report_submission_rate = 1.0 if weekly_report and weekly_report.is_submitted else 0.0
        
        # Communication Responsiveness (placeholder)
        communication_responsiveness = 0.8  # Would be computed from response times
        
        # Engagement Score
        engagement_score = (
            attendance_rate * 0.3 +
            meeting_participation * 0.25 +
            report_submission_rate * 0.25 +
            communication_responsiveness * 0.2
        ) * 100
        
        return {
            'engagement_score': round(engagement_score, 2),
            'attendance_rate': round(attendance_rate, 4),
            'meeting_participation': round(meeting_participation * 100, 2),
            'report_submission_rate': round(report_submission_rate * 100, 2),
            'communication_responsiveness': round(communication_responsiveness * 100, 2),
        }
    
    def _compute_growth_metrics(self, tasks) -> Dict[str, Any]:
        """Compute learning and growth velocity metrics."""
        tasks_list = list(tasks)
        
        # Complexity Handled
        complexity_weights = {'SIMPLE': 0.5, 'MODERATE': 0.7, 'COMPLEX': 0.9, 'VERY_COMPLEX': 1.0}
        avg_complexity = sum(
            complexity_weights.get(t.complexity, 0.5) for t in tasks_list
        ) / len(tasks_list) if tasks_list else 0.5
        
        # Learning Adaptability Index (placeholder)
        # Would be computed from time taken to complete tasks vs estimated
        learning_adaptability = 0.7
        
        # Growth Score
        growth_score = (avg_complexity * 0.5 + learning_adaptability * 0.5) * 100
        
        return {
            'growth_score': round(growth_score, 2),
            'skill_improvement_trend': 0.0,  # Would require historical data
            'complexity_handled': round(avg_complexity * 100, 2),
            'learning_adaptability_index': round(learning_adaptability * 100, 2),
        }
    
    def _compute_sentiment_metrics(self, weekly_report) -> Dict[str, Any]:
        """Compute behavioral and sentiment analysis from mentor feedback."""
        if not weekly_report:
            return {
                'mentor_sentiment_score': 0.0,
                'initiative_signals': [],
                'burnout_signals': [],
                'positive_feedback_count': 0,
                'negative_feedback_count': 0,
            }
        
        # Analyze mentor comments
        mentor_comments = (weekly_report.mentor_comments or '').lower()
        
        # Positive indicators
        positive_keywords = ['excellent', 'great', 'good', 'impressive', 'outstanding', 'proactive', 'initiative']
        negative_keywords = ['poor', 'needs improvement', 'concern', 'late', 'missed', 'unacceptable']
        
        positive_count = sum(1 for kw in positive_keywords if kw in mentor_comments)
        negative_count = sum(1 for kw in negative_keywords if kw in mentor_comments)
        
        # Sentiment Score
        total_sentiments = positive_count + negative_count
        sentiment_score = (positive_count / total_sentiments * 100) if total_sentiments > 0 else 50.0
        
        # Initiative Signals
        initiative_signals = [
            kw for kw in positive_keywords if kw in mentor_comments
        ]
        
        # Burnout Signals
        burnout_keywords = ['tired', 'overwhelmed', 'stressed', 'burnout']
        burnout_signals = [kw for kw in burnout_keywords if kw in mentor_comments]
        
        return {
            'mentor_sentiment_score': round(sentiment_score, 2),
            'initiative_signals': initiative_signals,
            'burnout_signals': burnout_signals,
            'positive_feedback_count': positive_count,
            'negative_feedback_count': negative_count,
        }
    
    def _compute_dropout_risk(self, metrics: Dict) -> Dict[str, Any]:
        """Compute dropout risk assessment."""
        dropout_risk_score = 0.0
        risk_factors = []
        
        # Task Completion Risk
        if metrics.get('task_completion_rate', 1.0) < self.DROPOUT_RISK_THRESHOLDS['task_completion_rate']:
            dropout_risk_score += 25
            risk_factors.append('Low task completion rate')
        
        # Attendance Risk
        if metrics.get('attendance_rate', 1.0) < self.DROPOUT_RISK_THRESHOLDS['attendance_rate']:
            dropout_risk_score += 25
            risk_factors.append('Poor attendance')
        
        # Engagement Risk
        if metrics.get('engagement_score', 100) < self.DROPOUT_RISK_THRESHOLDS['engagement_score'] * 100:
            dropout_risk_score += 25
            risk_factors.append('Low engagement')
        
        # Quality Risk
        if metrics.get('quality_score', 100) < self.DROPOUT_RISK_THRESHOLDS['quality_score'] * 100:
            dropout_risk_score += 25
            risk_factors.append('Poor work quality')
        
        # Determine Risk Level
        if dropout_risk_score < 30:
            dropout_risk = 'LOW'
        elif dropout_risk_score < 60:
            dropout_risk = 'MEDIUM'
        else:
            dropout_risk = 'HIGH'
        
        return {
            'dropout_risk_score': round(dropout_risk_score, 2),
            'dropout_risk': dropout_risk,
            'dropout_risk_factors': risk_factors,
        }
    
    def _compute_full_time_suitability(self, metrics: Dict, intern) -> Dict[str, Any]:
        """Compute full-time job suitability prediction."""
        # Check if intern has enough data
        intern_start = intern.date_joined
        days_internship = (datetime.now().date() - intern_start.date()).days
        
        # Base scores
        productivity = metrics.get('productivity_score', 0)
        quality = metrics.get('quality_score', 0)
        engagement = metrics.get('engagement_score', 0)
        growth = metrics.get('growth_score', 0)
        
        # Full-Time Readiness Score
        readiness_score = (
            productivity * 0.25 +
            quality * 0.30 +
            engagement * 0.20 +
            growth * 0.25
        )
        
        # PPO Probability
        if (
            productivity >= self.PPO_THRESHOLDS['productivity_score'] and
            quality >= self.PPO_THRESHOLDS['quality_score'] and
            engagement >= self.PPO_THRESHOLDS['engagement_score'] and
            growth >= self.PPO_THRESHOLDS['growth_score'] and
            days_internship >= self.PPO_THRESHOLDS['min_weeks'] * 7
        ):
            promotion_probability = min(95, readiness_score + 10)
            role_upgrade = 'Full-Time Offer'
        else:
            promotion_probability = max(10, readiness_score - 20)
            role_upgrade = ''
        
        return {
            'full_time_readiness_score': round(readiness_score, 2),
            'promotion_probability': round(promotion_probability, 2),
            'role_upgrade_suggestion': role_upgrade,
        }
    
    def _compute_overall_score(self, metrics: Dict) -> float:
        """Compute overall performance score."""
        weights = {
            'productivity_score': 0.30,
            'quality_score': 0.25,
            'engagement_score': 0.20,
            'growth_score': 0.15,
            'mentor_sentiment_score': 0.10,
        }
        
        overall = 0.0
        for metric, weight in weights.items():
            value = metrics.get(metric, 0)
            overall += value * weight
        
        return round(overall, 2)
    
    def _compute_growth_trend(self, weekly_metrics) -> float:
        """Compute month-over-month improvement trend."""
        if weekly_metrics.count() < 2:
            return 0.0
        
        sorted_metrics = weekly_metrics.order_by('period_start')
        first_week = sorted_metrics.first()
        last_week = sorted_metrics.last()
        
        if first_week.overall_performance_score == 0:
            return 0.0
        
        improvement = (
            (last_week.overall_performance_score - first_week.overall_performance_score) /
            first_week.overall_performance_score * 100
        )
        
        return round(improvement, 2)
    
    def _identify_skill_gaps(self, tasks) -> List[str]:
        """Identify skill gaps from task performance."""
        skill_gaps = []
        
        # Analyze task complexity handling
        completed_tasks = [t for t in tasks if t.status == 'COMPLETED']
        
        if completed_tasks:
            low_complexity_ratio = sum(
                1 for t in completed_tasks if t.complexity in ['SIMPLE', 'MODERATE']
            ) / len(completed_tasks)
            
            if low_complexity_ratio > 0.7:
                skill_gaps.append('Handle more complex tasks')
        
        # Quality issues
        avg_bug_count = sum(t.bug_count for t in completed_tasks) / len(completed_tasks) if completed_tasks else 0
        if avg_bug_count > 2:
            skill_gaps.append('Reduce bug frequency')
        
        return skill_gaps
    
    def _identify_skill_gaps_from_weekly(self, weekly_metrics) -> List[str]:
        """Identify skill gaps from weekly metrics."""
        skill_gaps = []
        
        avg_quality = weekly_metrics.aggregate(Avg('quality_score'))['quality_score__avg'] or 0
        if avg_quality < 60:
            skill_gaps.append('Improve code quality')
        
        avg_growth = weekly_metrics.aggregate(Avg('growth_score'))['growth_score__avg'] or 0
        if avg_growth < 50:
            skill_gaps.append('Increase learning velocity')
        
        return skill_gaps
    
    def _generate_recommendations(self, metrics: Dict) -> List[str]:
        """Generate personalized recommendations based on metrics."""
        recommendations = []
        
        if metrics.get('task_completion_rate', 1) < 0.6:
            recommendations.append('Focus on completing assigned tasks on time')
        
        if metrics.get('deadline_adherence', 1) < 0.7:
            recommendations.append('Improve time management skills')
        
        if metrics.get('quality_score', 100) < 60:
            recommendations.append('Pay more attention to code quality')
        
        if metrics.get('engagement_score', 100) < 60:
            recommendations.append('Increase participation in team activities')
        
        if metrics.get('attendance_rate', 1) < 0.8:
            recommendations.append('Maintain consistent attendance')
        
        if not recommendations:
            recommendations.append('Keep up the excellent work!')
        
        return recommendations
    
    def _generate_monthly_recommendations(self, metrics: Dict) -> List[str]:
        """Generate monthly recommendations."""
        recommendations = []
        
        if metrics.get('overall_performance_score', 0) >= 80:
            recommendations.append('Eligible for PPO consideration')
            recommendations.append('Consider for more complex projects')
        elif metrics.get('overall_performance_score', 0) >= 60:
            recommendations.append('Continue current performance')
            recommendations.append('Focus on areas with lower scores')
        else:
            recommendations.append('Requires mentor support')
            recommendations.append('Develop improvement plan')
        
        if metrics.get('dropout_risk') == 'HIGH':
            recommendations.append('URGENT: Address dropout risk factors')
        
        return recommendations
    
    def _generate_monthly_report(self, intern, metrics: Dict, monthly_report: datetime) -> Dict[str, Any]:
        """Generate comprehensive monthly evaluation report."""
        # Determine performance grade
        score = metrics.get('overall_performance_score', 0)
        if score >= 90:
            grade = 'A+'
        elif score >= 80:
            grade = 'A'
        elif score >= 70:
            grade = 'B+'
        elif score >= 60:
            grade = 'B'
        elif score >= 50:
            grade = 'C'
        else:
            grade = 'D'
        
        # Determine recommendation
        if score >= 80 and metrics.get('dropout_risk') == 'LOW':
            recommendation = 'PPO'
            recommendation_reason = 'Consistently high performance with low dropout risk'
        elif score >= 60:
            recommendation = 'CONTINUE'
            recommendation_reason = 'Good performance, continue with mentor support'
        elif metrics.get('dropout_risk') == 'HIGH':
            recommendation = 'MENTOR_SUPPORT'
            recommendation_reason = 'High dropout risk identified, immediate intervention needed'
        else:
            recommendation = 'WARNING'
            recommendation_reason = 'Performance below expectations'
        
        # Determine risk status
        if metrics.get('dropout_risk') == 'LOW' and score >= 70:
            risk_status = 'ON_TRACK'
        elif metrics.get('dropout_risk') == 'HIGH' or score < 50:
            risk_status = 'CRITICAL'
        else:
            risk_status = 'AT_RISK'
        
        report_data = {
            'intern_id': intern.id,
            'evaluation_month': monthly_report.date(),
            'period_start': metrics.get('period_start'),
            'period_end': metrics.get('period_end'),
            'overall_performance_score': score,
            'performance_grade': grade,
            'risk_status': risk_status,
            'recommendation': recommendation,
            'recommendation_reason': recommendation_reason,
            'skills_acquired': [],  # Would be populated from weekly reports
            'skill_development_progress': metrics.get('growth_score', 0),
            'mentor_rating_avg': metrics.get('avg_quality_rating', 0),
            'goals_progress_percentage': metrics.get('task_completion_rate', 0) * 100,
        }
        
        # Save evaluation report
        MonthlyEvaluationReport.objects.update_or_create(
            intern=intern,
            evaluation_month=monthly_report.date(),
            defaults=report_data
        )
        
        return report_data


# Helper function for Sum aggregation
from django.db.models import Sum
