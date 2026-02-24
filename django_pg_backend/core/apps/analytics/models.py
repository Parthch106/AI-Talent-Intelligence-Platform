from django.db import models
from django.conf import settings


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
# V2 ANALYTICS SCHEMA - Hybrid AI ML Pipeline Models
# (see INTERN_ANALYSIS_SCHEMA_V2.md)
# Supports: SentenceTransformer embeddings, Structured ML features,
#           Multi-output scoring, Role-aware matching, Model versioning
# ============================================================================


class JobRole(models.Model):
    """
    Defines job roles and their skill requirements.
    V2: Added role_embedding for semantic role matching (pgvector).
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
    
    # V2: Role embedding for semantic matching (stored as JSON list of floats)
    # Use pgvector VECTOR type in raw SQL; Django stores as JSONField fallback
    role_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Role embedding vector for semantic matching (pgvector compatible)"
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
    Each application = Intern × Role.
    V2: Renamed fields (resume_text → resume_raw_text, status → application_status).
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
    
    # V2: Renamed from resume_text → resume_raw_text
    resume_raw_text = models.TextField(
        blank=True,
        help_text="Raw resume text before parsing"
    )
    # V2: Renamed from status → application_status
    application_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='APPLIED'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Application"
        verbose_name_plural = "Applications"
        ordering = ['-created_at']
        # One application per intern per role
        unique_together = ['intern', 'job_role']
        indexes = [
            models.Index(fields=['intern'], name='idx_application_candidate'),
            models.Index(fields=['job_role'], name='idx_application_role'),
        ]
    
    def __str__(self):
        return f"{self.intern.email} - {self.job_role.role_title}"


# ============================================================================
# V2: Resume data split into 3 tables (was single ResumeFeature in V1)
# 1. ResumeSection - Parsed text sections for transformer modeling
# 2. ResumeEmbedding - Vector embeddings for semantic similarity
# 3. StructuredFeature - Numerical features for XGBoost/LightGBM
# ============================================================================


class ResumeSection(models.Model):
    """
    V2 NEW: Stores structured resume sections for transformer-based modeling.
    Parsed text from resume, organized by section type.
    """
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='resume_sections'
    )
    
    # Professional Summary
    professional_summary = models.TextField(
        blank=True,
        help_text="Professional summary / objective section"
    )
    
    # Skills Breakdown
    technical_skills = models.TextField(
        blank=True,
        help_text="Technical skills text"
    )
    tools_technologies = models.TextField(
        blank=True,
        help_text="Tools and technologies used"
    )
    frameworks_libraries = models.TextField(
        blank=True,
        help_text="Frameworks and libraries"
    )
    databases = models.TextField(
        blank=True,
        help_text="Database technologies"
    )
    cloud_platforms = models.TextField(
        blank=True,
        help_text="Cloud platforms experience"
    )
    soft_skills = models.TextField(
        blank=True,
        help_text="Soft skills mentioned"
    )
    
    # Experience
    experience_titles = models.TextField(
        blank=True,
        help_text="Job/internship titles"
    )
    experience_descriptions = models.TextField(
        blank=True,
        help_text="Experience descriptions and responsibilities"
    )
    experience_duration_text = models.TextField(
        blank=True,
        help_text="Duration text for each experience"
    )
    
    # Projects
    project_titles = models.TextField(
        blank=True,
        help_text="Project titles"
    )
    project_descriptions = models.TextField(
        blank=True,
        help_text="Project descriptions"
    )
    project_technologies = models.TextField(
        blank=True,
        help_text="Technologies used in projects"
    )
    
    # Education & Achievements
    education_text = models.TextField(
        blank=True,
        help_text="Education details"
    )
    certifications = models.TextField(
        blank=True,
        help_text="Certifications obtained"
    )
    achievements = models.TextField(
        blank=True,
        help_text="Awards and achievements"
    )
    extracurriculars = models.TextField(
        blank=True,
        help_text="Extracurricular activities"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Resume Section"
        verbose_name_plural = "Resume Sections"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Sections for {self.application.intern.email}"


class ResumeEmbedding(models.Model):
    """
    V2 NEW: Stores transformer embeddings for semantic similarity.
    Embeddings stored as JSON arrays (pgvector VECTOR type in raw SQL).
    """
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='resume_embeddings'
    )
    
    # Section-level embeddings (stored as JSON list of floats)
    summary_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Embedding vector for professional summary"
    )
    experience_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Embedding vector for experience section"
    )
    project_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Embedding vector for projects section"
    )
    skills_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Embedding vector for skills section"
    )
    combined_embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Combined embedding vector for full resume"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Resume Embedding"
        verbose_name_plural = "Resume Embeddings"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Embeddings for {self.application.intern.email}"


class StructuredFeature(models.Model):
    """
    V2: Stores numerical features derived from resume analysis.
    Reduced feature set compared to V1 ResumeFeature (relies on embeddings
    for semantic features instead of hand-crafted ones).
    """
    
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='structured_features'
    )
    
    # Role Matching
    skill_match_ratio = models.FloatField(
        default=0.0,
        help_text="Ratio of matched skills to required skills (0-1)"
    )
    domain_similarity_score = models.FloatField(
        default=0.0,
        help_text="Similarity between candidate domain and job domain (0-1)"
    )
    critical_skill_gap_count = models.IntegerField(
        default=0,
        help_text="Number of critical skills missing"
    )
    
    # Experience Strength
    experience_duration_months = models.IntegerField(
        default=0,
        help_text="Total experience in months"
    )
    internship_relevance_score = models.FloatField(
        default=0.0,
        help_text="Relevance of internship experience (0-1)"
    )
    project_complexity_score = models.FloatField(
        default=0.0,
        help_text="Complexity of projects (0-1)"
    )
    
    # Education
    degree_level_encoded = models.IntegerField(
        default=1,
        help_text="1=High School, 2=Bachelor, 3=Masters, 4=PhD"
    )
    gpa_normalized = models.FloatField(
        default=0.0,
        help_text="Normalized GPA score (0-1)"
    )
    
    # Resume Authenticity
    quantified_impact_presence = models.BooleanField(
        default=False,
        help_text="Whether resume contains quantifiable impact statements"
    )
    writing_clarity_score = models.FloatField(
        default=0.0,
        help_text="Clarity of writing (0-1)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Structured Feature"
        verbose_name_plural = "Structured Features"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Features for {self.application.intern.email}"


class ModelPrediction(models.Model):
    """
    V2: Stores inference results from hybrid models.
    Changed from V1: Renamed scores, removed communication/leadership,
    added semantic_match_score and model_type.
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
    
    # V2 ML Scores (5 scores instead of V1's 6)
    suitability_score = models.FloatField(
        default=0.0,
        help_text="Overall suitability (0-1)"
    )
    technical_score = models.FloatField(
        default=0.0,
        help_text="Technical skills score (0-1)"
    )
    growth_score = models.FloatField(
        default=0.0,
        help_text="Growth potential score (0-1)"
    )
    authenticity_score = models.FloatField(
        default=0.0,
        help_text="Resume authenticity score (0-1)"
    )
    # V2 NEW: Semantic match score from transformer embeddings
    semantic_match_score = models.FloatField(
        default=0.0,
        help_text="Semantic similarity match score (0-1)"
    )
    
    # Decision
    decision = models.CharField(
        max_length=30,
        choices=DECISION_CHOICES,
        blank=True,
        help_text="ML prediction decision"
    )
    
    # V2: Added model_type for hybrid model tracking
    model_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Type of model used (e.g., XGBoost, LightGBM, Transformer)"
    )
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
    Unchanged from V1.
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
    Unchanged from V1.
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


# V2: AuthenticityReview table REMOVED
# Authenticity is now handled by:
# - authenticity_score in ModelPrediction
# - writing_clarity_score + quantified_impact_presence in StructuredFeature


class ModelRegistry(models.Model):
    """
    Model Registry - Version tracking and model performance metrics.
    Unchanged from V1.
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
