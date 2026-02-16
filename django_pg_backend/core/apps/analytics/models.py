from django.db import models
from django.conf import settings


# ============================================================================
# Legacy Models - Intern Intelligence (used by analytics_service.py)
# ============================================================================


class InternIntelligence(models.Model):
    """
    Stores computed intelligence metrics for each intern.
    Used for tracking technical scores, AI readiness, and risk assessment.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intern_intelligence',
        limit_choices_to={'role': 'INTERN'}
    )
    
    # Core Scores
    technical_score = models.FloatField(
        default=0.0,
        help_text='Technical skills proficiency score'
    )
    leadership_score = models.FloatField(
        default=0.0,
        help_text='Leadership and management potential score'
    )
    communication_score = models.FloatField(
        default=0.0,
        help_text='Communication skills score'
    )
    culture_fit_score = models.FloatField(
        default=0.0,
        help_text='Cultural fit assessment score'
    )
    ai_readiness_score = models.FloatField(
        default=0.0,
        help_text='Readiness for AI-assisted work score'
    )
    predicted_growth_score = models.FloatField(
        default=0.0,
        help_text='Predicted growth trajectory score'
    )
    
    # Skill Analysis
    skill_profile = models.JSONField(
        default=dict,
        help_text='Detailed skill breakdown by category'
    )
    domain_strengths = models.JSONField(
        default=list,
        help_text='List of strongest domain areas'
    )
    skill_gaps = models.JSONField(
        default=list,
        help_text='Identified skill gaps'
    )
    
    # Recommendations
    recommendations = models.JSONField(
        default=list,
        help_text='Personalized development recommendations'
    )
    
    # Risk Assessment
    risk_flags = models.JSONField(
        default=list,
        help_text='Risk indicators'
    )
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Intern Intelligence'
        verbose_name_plural = 'Intern Intelligence'
        ordering = ['-calculated_at']
    
    def __str__(self):
        return f"Intelligence: {self.user.email}"


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
    
    def _get_pdf_upload_path(instance, filename):
        """Generate upload path for weekly report PDFs."""
        return f'weeklyreports/{instance.intern.id}/report.pdf'
    
    # PDF Report Upload
    pdf_report = models.FileField(
        upload_to=_get_pdf_upload_path,
        null=True,
        blank=True,
        help_text="Weekly report PDF file"
    )
    
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


# ============================================================================
# NEW ANALYTICS SCHEMA - ML Pipeline Models (see INTERN_ANALYSIS_SCHEMA.md)
# ============================================================================


class JobRole(models.Model):
    """
    Defines job roles and their skill requirements.
    Replaces the old RoleRequirement model.
    """
    
    role_title = models.CharField(
        max_length=100,
        unique=True,
        help_text="Job role title (e.g., FRONTEND_DEVELOPER, BACKEND_DEVELOPER)"
    )
    role_description = models.TextField(
        blank=True,
        help_text="Detailed role description"
    )
    
    # Skill Requirements
    mandatory_skills = models.JSONField(
        default=list,
        help_text="List of required mandatory skills"
    )
    preferred_skills = models.JSONField(
        default=list,
        help_text="List of preferred/nice-to-have skills"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Job Role"
        verbose_name_plural = "Job Roles"
        ordering = ['role_title']
    
    def __str__(self):
        return self.role_title


class Application(models.Model):
    """
    Links candidates (interns from accounts.User) to job roles.
    Each application = Intern × Role
    """
    
    STATUS_CHOICES = [
        ('APPLIED', 'Applied'),
        ('UNDER_REVIEW', 'Under Review'),
        ('INTERVIEW_SCHEDULED', 'Interview Scheduled'),
        ('TECHNICAL_ROUND', 'Technical Round'),
        ('HR_ROUND', 'HR Round'),
        ('OFFERED', 'Offered'),
        ('REJECTED', 'Rejected'),
        ('WITHDRAWN', 'Withdrawn'),
    ]
    
    # Reference to User (intern) - using accounts.User
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='applications',
        limit_choices_to={'role': 'INTERN'}
    )
    
    # Reference to Job Role
    job_role = models.ForeignKey(
        JobRole,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    
    # Application Details
    resume_text = models.TextField(
        blank=True,
        help_text="Parsed resume text"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='APPLIED'
    )
    application_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Application"
        verbose_name_plural = "Applications"
        ordering = ['-application_date']
        # One application per intern per role
        unique_together = ['intern', 'job_role']
    
    def __str__(self):
        return f"{self.intern.email} - {self.job_role.role_title}"


class ResumeFeature(models.Model):
    """
    ML Input Features - Feature store for model training and inference.
    Stores computed features from resume data.
    """
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='resume_features'
    )
    
    # Skill & Role Matching
    skill_match_ratio = models.FloatField(
        default=0.0,
        help_text="Ratio of matched skills to required skills (0-1)"
    )
    mandatory_skill_coverage = models.BooleanField(
        default=False,
        help_text="Whether all mandatory skills are present"
    )
    domain_similarity_score = models.FloatField(
        default=0.0,
        help_text="Similarity between candidate domain and job domain (0-1)"
    )
    skill_depth_score = models.FloatField(
        default=0.0,
        help_text="Depth/level of each skill (0-1)"
    )
    skill_project_consistency = models.FloatField(
        default=0.0,
        help_text="Consistency between skills and projects (0-1)"
    )
    critical_skill_gap_count = models.IntegerField(
        default=0,
        help_text="Number of critical skills missing"
    )
    
    # Education
    degree_level_encoded = models.IntegerField(
        default=1,
        help_text="1=High School, 2=Bachelor, 3=Masters+"
    )
    gpa_normalized = models.FloatField(
        default=0.0,
        help_text="Normalized GPA score (0-1)"
    )
    university_tier_score = models.FloatField(
        default=0.0,
        help_text="University ranking score (0-1)"
    )
    coursework_relevance_score = models.FloatField(
        default=0.0,
        help_text="Relevance of coursework to role (0-1)"
    )
    
    # Experience
    experience_duration_months = models.IntegerField(
        default=0,
        help_text="Total experience in months"
    )
    internship_relevance_score = models.FloatField(
        default=0.0,
        help_text="Relevance of internship experience (0-1)"
    )
    open_source_score = models.FloatField(
        default=0.0,
        help_text="Open source contribution score (0-1)"
    )
    hackathon_count = models.IntegerField(
        default=0,
        help_text="Number of hackathons attended"
    )
    
    # Projects
    project_count = models.IntegerField(
        default=0,
        help_text="Number of projects"
    )
    project_complexity_score = models.FloatField(
        default=0.0,
        help_text="Complexity of projects (0-1)"
    )
    quantified_impact_presence = models.BooleanField(
        default=False,
        help_text="Whether projects have quantifiable impact"
    )
    production_tools_usage_score = models.FloatField(
        default=0.0,
        help_text="Usage of production tools (0-1)"
    )
    github_activity_score = models.FloatField(
        default=0.0,
        help_text="GitHub activity level (0-1)"
    )
    
    # Resume Quality
    keyword_stuffing_ratio = models.FloatField(
        default=0.0,
        help_text="Ratio of keywords to content (0-1)"
    )
    writing_clarity_score = models.FloatField(
        default=0.0,
        help_text="Clarity of writing (0-1)"
    )
    action_verb_density = models.FloatField(
        default=0.0,
        help_text="Density of action verbs (0-1)"
    )
    resume_consistency_score = models.FloatField(
        default=0.0,
        help_text="Overall consistency (0-1)"
    )
    resume_length_normalized = models.FloatField(
        default=0.0,
        help_text="Normalized resume length (0-1)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Resume Feature"
        verbose_name_plural = "Resume Features"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Features for {self.application.intern.email}"


class ModelPrediction(models.Model):
    """
    ML Model Outputs - Stores predictions for each application.
    """
    
    DECISION_CHOICES = [
        ('INTERVIEW_SHORTLIST', 'Interview Shortlist'),
        ('TECHNICAL_ASSIGNMENT', 'Technical Assignment'),
        ('MANUAL_REVIEW', 'Manual Review'),
        ('REJECT', 'Reject'),
    ]
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='prediction'
    )
    
    # ML Scores
    suitability_score = models.FloatField(
        default=0.0,
        help_text="Overall suitability (0-1)"
    )
    technical_competency_score = models.FloatField(
        default=0.0,
        help_text="Technical skills (0-1)"
    )
    growth_potential_score = models.FloatField(
        default=0.0,
        help_text="Growth potential (0-1)"
    )
    resume_authenticity_score = models.FloatField(
        default=0.0,
        help_text="Resume authenticity (0-1)"
    )
    communication_score = models.FloatField(
        default=0.0,
        help_text="Communication skills (0-1)"
    )
    leadership_score = models.FloatField(
        default=0.0,
        help_text="Leadership potential (0-1)"
    )
    
    # Decision
    decision = models.CharField(
        max_length=30,
        choices=DECISION_CHOICES,
        blank=True,
        help_text="ML prediction decision"
    )
    
    # Model Metadata
    model_version = models.CharField(
        max_length=50,
        blank=True,
        help_text="Version of model used for prediction"
    )
    confidence_score = models.FloatField(
        default=0.0,
        help_text="Model confidence (0-1)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Model Prediction"
        verbose_name_plural = "Model Predictions"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Prediction for {self.application.intern.email}: {self.decision}"


class HiringOutcome(models.Model):
    """
    Hiring Outcomes - Training Labels for model retraining.
    """
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='hiring_outcome'
    )
    
    # Interview Results
    shortlisted = models.BooleanField(
        default=False,
        help_text="Was candidate shortlisted"
    )
    technical_assignment_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Technical test score"
    )
    hr_feedback_score = models.FloatField(
        null=True,
        blank=True,
        help_text="HR round feedback (0-1)"
    )
    
    # Final Decision
    hired = models.BooleanField(
        default=False,
        help_text="Was candidate hired"
    )
    offer_extended = models.BooleanField(
        default=False,
        help_text="Was offer given"
    )
    offer_accepted = models.BooleanField(
        default=False,
        help_text="Was offer accepted"
    )
    
    # Training Label
    final_suitability_label = models.BooleanField(
        default=False,
        help_text="Final label for model training"
    )
    
    # Metadata
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Hiring Outcome"
        verbose_name_plural = "Hiring Outcomes"
        ordering = ['-recorded_at']
    
    def __str__(self):
        return f"Outcome for {self.application.intern.email}: Hired={self.hired}"


class GrowthTracking(models.Model):
    """
    Growth Tracking - Post-hire performance monitoring.
    """
    
    # Reference to the intern (User)
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='growth_tracking',
        limit_choices_to={'role': 'INTERN'}
    )
    
    # Tracking Period
    months_since_joining = models.IntegerField(
        default=0,
        help_text="Months employed"
    )
    
    # Performance Metrics
    performance_rating = models.FloatField(
        default=0.0,
        help_text="Performance rating (0-5)"
    )
    skill_growth_score = models.FloatField(
        default=0.0,
        help_text="Skill improvement (0-1)"
    )
    manager_feedback_score = models.FloatField(
        default=0.0,
        help_text="Manager rating (0-1)"
    )
    
    # Status
    retention_status = models.BooleanField(
        default=True,
        help_text="Still employed"
    )
    promotion_received = models.BooleanField(
        default=False,
        help_text="Was promoted"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Growth Tracking"
        verbose_name_plural = "Growth Tracking"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Growth: {self.intern.email} - {self.months_since_joining} months"


class AuthenticityReview(models.Model):
    """
    Resume Authenticity Review - Manual review results.
    """
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='authenticity_review'
    )
    
    # Review Metrics
    skill_project_mismatch_ratio = models.FloatField(
        default=0.0,
        help_text="Mismatch ratio between skills and projects (0-1)"
    )
    excessive_skill_listing_flag = models.BooleanField(
        default=False,
        help_text="Too many skills flag"
    )
    duplicate_bullet_pattern_flag = models.BooleanField(
        default=False,
        help_text="Duplicate patterns flag"
    )
    authenticity_label = models.BooleanField(
        default=True,
        help_text="Is resume authentic"
    )
    
    # Reviewer Info
    reviewed_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reviewer name"
    )
    reviewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Authenticity Review"
        verbose_name_plural = "Authenticity Reviews"
        ordering = ['-reviewed_at']
    
    def __str__(self):
        return f"Review for {self.application.intern.email}: Authentic={self.authenticity_label}"


class ModelRegistry(models.Model):
    """
    Model Registry - Version tracking and model performance metrics.
    """
    
    model_name = models.CharField(
        max_length=100,
        help_text="Model name"
    )
    model_version = models.CharField(
        max_length=50,
        help_text="Version string"
    )
    
    # Performance Metrics
    training_data_size = models.IntegerField(
        default=0,
        help_text="Number of training samples"
    )
    training_accuracy = models.FloatField(
        default=0.0,
        help_text="Training accuracy"
    )
    roc_auc = models.FloatField(
        default=0.0,
        help_text="ROC-AUC score"
    )
    f1_score = models.FloatField(
        default=0.0,
        help_text="F1 score"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Model Registry"
        verbose_name_plural = "Model Registries"
        ordering = ['-created_at']
        unique_together = ['model_name', 'model_version']
    
    def __str__(self):
        return f"{self.model_name} v{self.model_version}"
