from django.db import models
from django.conf import settings


class RoleRequirement(models.Model):
    """
    Defines skill and qualification requirements for different job roles.
    Used for resume-to-role matching and suitability analysis.
    """
    
    ROLE_CHOICES = [
        ('FRONTEND_DEVELOPER', 'Frontend Developer'),
        ('BACKEND_DEVELOPER', 'Backend Developer'),
        ('FULLSTACK_DEVELOPER', 'Fullstack Developer'),
        ('DATA_SCIENTIST', 'Data Scientist'),
        ('ML_ENGINEER', 'Machine Learning Engineer'),
        ('DEVOPS_ENGINEER', 'DevOps Engineer'),
        ('MOBILE_DEVELOPER', 'Mobile Developer'),
        ('QA_ENGINEER', 'QA Engineer'),
        ('UI_UX_DESIGNER', 'UI/UX Designer'),
        ('PRODUCT_MANAGER', 'Product Manager'),
    ]
    
    role_name = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        unique=True,
        help_text="Job role name"
    )
    
    # Required Core Skills
    required_core_skills = models.JSONField(
        default=list,
        help_text="List of required core skills for this role"
    )
    
    # Preferred Skills
    preferred_skills = models.JSONField(
        default=list,
        help_text="List of preferred skills for this role"
    )
    
    # Minimum Qualification
    minimum_qualification = models.CharField(
        max_length=100,
        blank=True,
        help_text="Minimum education qualification required"
    )
    
    # Experience Threshold
    minimum_experience_years = models.FloatField(
        default=0.0,
        help_text="Minimum years of experience required"
    )
    
    # Domain Requirements
    required_domains = models.JSONField(
        default=list,
        help_text="List of required domain areas"
    )
    
    # Tool Requirements
    required_tools = models.JSONField(
        default=list,
        help_text="List of required tools/technologies"
    )
    
    # Project Requirements
    minimum_projects = models.IntegerField(
        default=0,
        help_text="Minimum number of projects required"
    )
    
    # Certification Requirements
    required_certifications = models.JSONField(
        default=list,
        help_text="List of required certifications"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Role Requirement"
        verbose_name_plural = "Role Requirements"
        ordering = ['role_name']
    
    def __str__(self):
        return f"{self.get_role_name_display()}"


class InternIntelligence(models.Model):
    """
    Stores computed intelligence metrics for each intern.
    These are derived from resume features and other assessments.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intern_intelligence',
        limit_choices_to={'role': 'INTERN'}
    )
    
    # Core Scores (0-1 scale)
    technical_score = models.FloatField(
        default=0.0,
        help_text="Technical skills proficiency score"
    )
    leadership_score = models.FloatField(
        default=0.0,
        help_text="Leadership and management potential score"
    )
    communication_score = models.FloatField(
        default=0.0,
        help_text="Communication skills score"
    )
    culture_fit_score = models.FloatField(
        default=0.0,
        help_text="Cultural fit assessment score"
    )
    ai_readiness_score = models.FloatField(
        default=0.0,
        help_text="Readiness for AI-assisted work score"
    )
    predicted_growth_score = models.FloatField(
        default=0.0,
        help_text="Predicted growth trajectory score"
    )
    
    # Detailed Metrics (stored as JSON)
    skill_profile = models.JSONField(
        default=dict,
        help_text="Detailed skill breakdown by category"
    )
    domain_strengths = models.JSONField(
        default=list,
        help_text="List of strongest domain areas"
    )
    skill_gaps = models.JSONField(
        default=list,
        help_text="Identified skill gaps"
    )
    recommendations = models.JSONField(
        default=list,
        help_text="Personalized development recommendations"
    )
    
    # Risk Flags
    risk_flags = models.JSONField(
        default=list,
        help_text="Risk indicators (low engagement, skill gaps, etc.)"
    )
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Intern Intelligence"
        verbose_name_plural = "Intern Intelligence"
        ordering = ['-calculated_at']
    
    def __str__(self):
        return f"Intelligence for {self.user.email}"


class ResumeFeature(models.Model):
    """
    Stores computed feature vectors for each resume.
    Used for AI model training and similarity matching.
    """
    
    resume_data = models.OneToOneField(
        'documents.ResumeData',
        on_delete=models.CASCADE,
        related_name='features'
    )
    
    # Skill Vectors
    skill_vector = models.JSONField(
        default=dict,
        help_text="Binary encoding of skills (present/not present)"
    )
    skill_frequency = models.JSONField(
        default=dict,
        help_text="Frequency score for each skill"
    )
    tfidf_embedding = models.JSONField(
        default=dict,
        help_text="TF-IDF-like embedding for skills"
    )
    
    # Category Analysis
    skill_categories = models.JSONField(
        default=dict,
        help_text="Skill counts by category"
    )
    
    # Derived Metrics
    skill_diversity_score = models.FloatField(default=0.0)
    experience_depth_score = models.FloatField(default=0.0)
    technical_ratio = models.FloatField(default=0.0)
    leadership_indicator = models.FloatField(default=0.0)
    domain_specialization = models.JSONField(default=dict)
    
    # Component Scores
    experience_score = models.FloatField(default=0.0)
    education_score = models.FloatField(default=0.0)
    project_score = models.FloatField(default=0.0)
    
    # Overall Score
    overall_score = models.FloatField(default=0.0)
    
    # Phase 2 - Part 1: Resume Analysis Fields
    # Skill-to-Role Matching Metrics
    skill_match_percentage = models.FloatField(
        default=0.0,
        help_text="Skill overlap percentage (0-100)"
    )
    core_skill_match_score = models.FloatField(
        default=0.0,
        help_text="Core skill match score (0-1)"
    )
    optional_skill_bonus_score = models.FloatField(
        default=0.0,
        help_text="Optional skill bonus score (0-1)"
    )
    critical_skill_gap_count = models.IntegerField(
        default=0,
        help_text="Count of missing critical skills"
    )
    domain_relevance_score = models.FloatField(
        default=0.0,
        help_text="Domain relevance score (0-1)"
    )
    
    # Project & Experience Depth Evaluation
    practical_exposure_score = models.FloatField(
        default=0.0,
        help_text="Practical exposure score (0-1)"
    )
    problem_solving_depth_score = models.FloatField(
        default=0.0,
        help_text="Problem-solving depth score (0-1)"
    )
    project_complexity_score = models.FloatField(
        default=0.0,
        help_text="Project complexity score (0-1)"
    )
    production_tools_usage_score = models.FloatField(
        default=0.0,
        help_text="Production tools usage score (0-1)"
    )
    internship_relevance_score = models.FloatField(
        default=0.0,
        help_text="Internship experience relevance score (0-1)"
    )
    
    # Resume Quality Indicators
    resume_authenticity_score = models.FloatField(
        default=0.0,
        help_text="Resume authenticity score (0-1)"
    )
    clarity_structure_score = models.FloatField(
        default=0.0,
        help_text="Clarity and structure score (0-1)"
    )
    keyword_stuffing_flag = models.BooleanField(
        default=False,
        help_text="Flag for potential keyword stuffing"
    )
    role_alignment_score = models.FloatField(
        default=0.0,
        help_text="Role alignment consistency score (0-1)"
    )
    achievement_orientation_score = models.FloatField(
        default=0.0,
        help_text="Achievement-oriented bullet points score (0-1)"
    )
    technical_clarity_score = models.FloatField(
        default=0.0,
        help_text="Technical clarity score (0-1)"
    )
    
    # Final Suitability Score
    suitability_score = models.FloatField(
        default=0.0,
        help_text="Final suitability score (0-100)"
    )
    
    # Decision
    DECISION_CHOICES = [
        ('INTERVIEW_SHORTLIST', 'Interview Shortlist'),
        ('MANUAL_REVIEW', 'Consider After Manual Review'),
        ('REJECT', 'Reject / Suggest Improvement'),
        ('NEEDS_IMPROVEMENT', 'Needs Skill Improvement'),
    ]
    decision = models.CharField(
        max_length=30,
        choices=DECISION_CHOICES,
        blank=True,
        null=True,
        help_text="Suitability decision"
    )
    
    # Decision Flags
    decision_flags = models.JSONField(
        default=list,
        help_text="Decision flags (e.g., 'High technical fit', 'Missing critical backend fundamentals')"
    )
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Resume Feature"
        verbose_name_plural = "Resume Features"
        ordering = ['-calculated_at']
    
    def __str__(self):
        return f"Features for Resume {self.resume_data.id}"


class AnalyticsSnapshot(models.Model):
    """
    Daily/weekly analytics snapshots for dashboard display.
    Pre-computed metrics for efficient dashboard loading.
    """
    
    SNAPSHOT_TYPES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    
    snapshot_type = models.CharField(max_length=10, choices=SNAPSHOT_TYPES)
    snapshot_date = models.DateField()
    
    # Intern Metrics
    total_interns = models.IntegerField(default=0)
    high_potential_count = models.IntegerField(default=0)
    avg_technical_score = models.FloatField(default=0.0)
    avg_ai_readiness = models.FloatField(default=0.0)
    
    # Skill Distribution
    skill_distribution = models.JSONField(default=dict)
    
    # Experience Distribution
    experience_distribution = models.JSONField(default=dict)
    
    # Domain Distribution
    domain_distribution = models.JSONField(default=dict)
    
    # Risk Analytics
    at_risk_count = models.IntegerField(default=0)
    risk_factors = models.JSONField(default=dict)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['snapshot_type', 'snapshot_date']
        verbose_name = "Analytics Snapshot"
        verbose_name_plural = "Analytics Snapshots"
    
    def __str__(self):
        return f"{self.snapshot_type} Snapshot - {self.snapshot_date}"


# ============================================================================
# PHASE 2 - PART 2: During Internship Monitoring Models
# ============================================================================


class TaskTracking(models.Model):
    """
    Tracks tasks assigned and completed by interns.
    Used for productivity index calculation.
    """
    
    STATUS_CHOICES = [
        ('ASSIGNED', 'Assigned'),
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('REVIEWED', 'Reviewed'),
        ('COMPLETED', 'Completed'),
        ('REWORK', 'Needs Rework'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tracked_tasks',
        limit_choices_to={'role': 'INTERN'}
    )
    
    task_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique task identifier from project management system"
    )
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Task Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ASSIGNED'
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )
    
    # Complexity
    COMPLEXITY_CHOICES = [
        ('SIMPLE', 'Simple'),
        ('MODERATE', 'Moderate'),
        ('COMPLEX', 'Complex'),
        ('VERY_COMPLEX', 'Very Complex'),
    ]
    complexity = models.CharField(
        max_length=15,
        choices=COMPLEXITY_CHOICES,
        default='MODERATE'
    )
    
    # Assignment
    assigned_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    
    # Completion
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Time Tracking (in hours)
    estimated_hours = models.FloatField(default=0.0)
    actual_hours = models.FloatField(default=0.0)
    
    # Quality Metrics
    quality_rating = models.FloatField(
        null=True,
        blank=True,
        help_text="Quality rating (0-5) from mentor"
    )
    code_review_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Code review score (0-100)"
    )
    bug_count = models.IntegerField(
        default=0,
        help_text="Number of bugs found in the task"
    )
    
    # Mentor Feedback
    mentor_feedback = models.TextField(blank=True)
    rework_required = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"Task {self.task_id}: {self.title}"


class AttendanceRecord(models.Model):
    """
    Tracks intern attendance.
    Used for engagement score calculation.
    """
    
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        limit_choices_to={'role': 'INTERN'}
    )
    
    date = models.DateField()
    
    # Attendance Status
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('HALF_DAY', 'Half Day'),
        ('WORK_FROM_HOME', 'Work From Home'),
    ]
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='PRESENT'
    )
    
    # Working Hours
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    working_hours = models.FloatField(default=0.0)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['intern', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.intern.email} - {self.date} ({self.status})"


class WeeklyReport(models.Model):
    """
    Weekly reports submitted by interns.
    Used for tracking progress and engagement.
    """
    
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weekly_reports',
        limit_choices_to={'role': 'INTERN'}
    )
    
    week_start_date = models.DateField()
    week_end_date = models.DateField()
    
    # Task Summary
    tasks_completed = models.IntegerField(default=0)
    tasks_in_progress = models.IntegerField(default=0)
    tasks_blocked = models.IntegerField(default=0)
    
    # Progress Description
    accomplishments = models.TextField(
        help_text="What was accomplished this week"
    )
    challenges = models.TextField(
        blank=True,
        help_text="Challenges faced"
    )
    learnings = models.TextField(
        blank=True,
        help_text="New skills or knowledge acquired"
    )
    
    # Goals for Next Week
    next_week_goals = models.TextField(
        help_text="Goals for next week"
    )
    
    # Self Assessment
    self_rating = models.FloatField(
        null=True,
        blank=True,
        help_text="Self rating (1-5)"
    )
    
    # Mentor Review
    mentor_comments = models.TextField(blank=True)
    mentor_rating = models.FloatField(
        null=True,
        blank=True,
        help_text="Mentor rating (1-5)"
    )
    
    # Submission Status
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_reviewed = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['intern', 'week_start_date']
        ordering = ['-week_start_date']
    
    def __str__(self):
        return f"Weekly Report: {self.intern.email} - {self.week_start_date}"


class PerformanceMetrics(models.Model):
    """
    Computed performance metrics for each intern.
    Updated weekly/monthly based on task and attendance data.
    """
    
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='performance_metrics',
        limit_choices_to={'role': 'INTERN'}
    )
    
    period_start = models.DateField()
    period_end = models.DateField()
    
    PERIOD_TYPE_CHOICES = [
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    period_type = models.CharField(
        max_length=10,
        choices=PERIOD_TYPE_CHOICES,
        default='WEEKLY'
    )
    
    # Productivity Index
    productivity_score = models.FloatField(
        default=0.0,
        help_text="Overall productivity score (0-100)"
    )
    tasks_completed = models.IntegerField(default=0)
    tasks_assigned = models.IntegerField(default=0)
    task_completion_rate = models.FloatField(
        default=0.0,
        help_text="Tasks completed / tasks assigned ratio"
    )
    deadline_adherence = models.FloatField(
        default=0.0,
        help_text="Percentage of tasks completed on time"
    )
    delay_ratio = models.FloatField(
        default=0.0,
        help_text="Ratio of delayed tasks"
    )
    
    # Quality Score
    quality_score = models.FloatField(
        default=0.0,
        help_text="Work quality score (0-100)"
    )
    avg_quality_rating = models.FloatField(
        default=0.0,
        help_text="Average quality rating from mentors"
    )
    avg_code_review_score = models.FloatField(
        default=0.0,
        help_text="Average code review score"
    )
    bug_frequency = models.FloatField(
        default=0.0,
        help_text="Bugs per task"
    )
    rework_percentage = models.FloatField(
        default=0.0,
        help_text="Percentage of tasks requiring rework"
    )
    
    # Learning & Growth Velocity
    growth_score = models.FloatField(
        default=0.0,
        help_text="Learning and growth velocity score (0-100)"
    )
    skill_improvement_trend = models.FloatField(
        default=0.0,
        help_text="Week-over-week improvement percentage"
    )
    complexity_handled = models.FloatField(
        default=0.0,
        help_text="Average complexity of tasks handled"
    )
    learning_adaptability_index = models.FloatField(
        default=0.0,
        help_text="Ability to learn new skills quickly"
    )
    
    # Engagement & Commitment
    engagement_score = models.FloatField(
        default=0.0,
        help_text="Engagement and commitment score (0-100)"
    )
    attendance_rate = models.FloatField(
        default=0.0,
        help_text="Percentage of days present"
    )
    meeting_participation = models.FloatField(
        default=0.0,
        help_text="Meeting participation rate (0-100)"
    )
    report_submission_rate = models.FloatField(
        default=0.0,
        help_text="Weekly report submission rate (0-100)"
    )
    communication_responsiveness = models.FloatField(
        default=0.0,
        help_text="Response time to messages (0-100)"
    )
    
    # Behavioral & Sentiment Analysis
    mentor_sentiment_score = models.FloatField(
        default=0.0,
        help_text="Sentiment analysis of mentor feedback (0-100)"
    )
    initiative_signals = models.JSONField(
        default=list,
        help_text="List of initiative indicators detected"
    )
    burnout_signals = models.JSONField(
        default=list,
        help_text="List of burnout warning signs"
    )
    positive_feedback_count = models.IntegerField(default=0)
    negative_feedback_count = models.IntegerField(default=0)
    
    # Dropout Risk Assessment
    DROPOUT_RISK_CHOICES = [
        ('LOW', 'Low Risk'),
        ('MEDIUM', 'Medium Risk'),
        ('HIGH', 'High Risk'),
    ]
    dropout_risk = models.CharField(
        max_length=10,
        choices=DROPOUT_RISK_CHOICES,
        default='LOW'
    )
    dropout_risk_score = models.FloatField(
        default=0.0,
        help_text="Dropout risk probability (0-100)"
    )
    dropout_risk_factors = models.JSONField(
        default=list,
        help_text="List of dropout risk factors"
    )
    
    # Full-Time Suitability Prediction
    full_time_readiness_score = models.FloatField(
        default=0.0,
        help_text="Full-time job readiness score (0-100)"
    )
    promotion_probability = models.FloatField(
        default=0.0,
        help_text="Probability of getting PPO (0-100)"
    )
    role_upgrade_suggestion = models.CharField(
        max_length=50,
        blank=True,
        help_text="Suggested role upgrade if applicable"
    )
    
    # Overall Score
    overall_performance_score = models.FloatField(
        default=0.0,
        help_text="Overall performance score (0-100)"
    )
    
    # Skill Gap Analysis
    skill_gaps = models.JSONField(
        default=list,
        help_text="List of identified skill gaps"
    )
    recommended_actions = models.JSONField(
        default=list,
        help_text="List of recommended actions"
    )
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['intern', 'period_start', 'period_type']
        ordering = ['-period_start']
    
    def __str__(self):
        return f"Performance: {self.intern.email} - {self.period_start} to {self.period_end}"


class MonthlyEvaluationReport(models.Model):
    """
    Monthly evaluation report for each intern.
    Comprehensive summary of intern performance.
    """
    
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='monthly_evaluations',
        limit_choices_to={'role': 'INTERN'}
    )
    
    evaluation_month = models.DateField(
        help_text="First day of the evaluation month"
    )
    
    # Period Summary
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Overall Performance
    overall_performance_score = models.FloatField(
        default=0.0,
        help_text="Overall performance score (0-100)"
    )
    performance_grade = models.CharField(
        max_length=5,
        help_text="Performance grade (A, B, C, D, F)"
    )
    
    # Growth Trend Analysis
    growth_trend_graph = models.JSONField(
        default=list,
        help_text="Data points for growth trend visualization"
    )
    month_over_month_improvement = models.FloatField(
        default=0.0,
        help_text="Month-over-month improvement percentage"
    )
    
    # Risk Status
    RISK_STATUS_CHOICES = [
        ('ON_TRACK', 'On Track'),
        ('AT_RISK', 'At Risk'),
        ('CRITICAL', 'Critical'),
    ]
    risk_status = models.CharField(
        max_length=15,
        choices=RISK_STATUS_CHOICES,
        default='ON_TRACK'
    )
    
    # Key Achievements
    key_achievements = models.JSONField(
        default=list,
        help_text="List of key achievements during the month"
    )
    
    # Areas for Improvement
    areas_for_improvement = models.JSONField(
        default=list,
        help_text="Areas identified for improvement"
    )
    
    # Skill Development Progress
    skills_acquired = models.JSONField(
        default=list,
        help_text="New skills acquired during the month"
    )
    skill_development_progress = models.FloatField(
        default=0.0,
        help_text="Progress in skill development (0-100)"
    )
    
    # Mentor Feedback Summary
    mentor_feedback_summary = models.TextField(blank=True)
    mentor_rating_avg = models.FloatField(
        default=0.0,
        help_text="Average mentor rating for the month"
    )
    
    # Recommendation
    RECOMMENDATION_CHOICES = [
        ('CONTINUE', 'Continue as is'),
        ('MENTOR_SUPPORT', 'Assign mentor support'),
        ('PPO', 'Offer PPO (Pre-Placement Offer)'),
        ('WARNING', 'Issue warning'),
        ('SKILL_PLAN', 'Skill improvement plan'),
        ('EXTEND', 'Extend internship'),
        ('TERMINATE', 'Terminate internship'),
    ]
    recommendation = models.CharField(
        max_length=20,
        choices=RECOMMENDATION_CHOICES,
        default='CONTINUE'
    )
    recommendation_reason = models.TextField(
        blank=True,
        help_text="Reason for the recommendation"
    )
    
    # Goal Progress
    monthly_goals = models.JSONField(
        default=list,
        help_text="Goals set for this month"
    )
    goals_achieved = models.JSONField(
        default=list,
        help_text="Goals achieved"
    )
    goals_missed = models.JSONField(
        default=list,
        help_text="Goals missed"
    )
    goals_progress_percentage = models.FloatField(
        default=0.0,
        help_text="Percentage of goals achieved"
    )
    
    # Next Month Focus
    next_month_focus = models.TextField(
        blank=True,
        help_text="Focus areas for next month"
    )
    
    # Final Notes
    intern_self_reflection = models.TextField(
        blank=True,
        help_text="Intern's self-reflection"
    )
    manager_notes = models.TextField(
        blank=True,
        help_text="Additional notes from manager"
    )
    
    # Status
    is_draft = models.BooleanField(default=True)
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_reviewed = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_evaluations'
    )
    
    class Meta:
        unique_together = ['intern', 'evaluation_month']
        ordering = ['-evaluation_month']
    
    def __str__(self):
        return f"Monthly Evaluation: {self.intern.email} - {self.evaluation_month}"
