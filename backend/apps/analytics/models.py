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
    
    # Project link (optional - can link a task to a specific project assignment)
    project_assignment = models.ForeignKey(
        'projects.ProjectAssignment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    project_module = models.ForeignKey(
        'projects.ProjectModule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    # Skills developed by this task (copied from TaskTemplate when task is created)
    skills_required = models.JSONField(
        default=list,
        blank=True,
        help_text="List of skill names developed by this task"
    )
    
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

    # ── V2 IoT future-proofing ────────────────────────────────────────────────
    is_late = models.BooleanField(
        default=False,
        help_text="True if check-in time was after the standard start time"
    )
    SOURCE_CHOICES = [
        ('MANUAL',     'Manual entry by manager'),
        ('WEB',        'Web app self check-in'),
        ('MOBILE',     'Mobile app'),
        ('IOT_DEVICE', 'IoT biometric device'),
    ]
    source = models.CharField(
        max_length=15,
        choices=SOURCE_CHOICES,
        default='MANUAL',
        help_text="How this attendance record was created"
    )
    device_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="IoT device identifier (populated only when source=IOT_DEVICE)"
    )
    
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
# V2 Phase 1 — Career Progression Pipeline Models
# ============================================================================


class EmploymentStage(models.Model):
    """
    Records which phase (Phase 1, Phase 2, or Full-Time) an intern is currently in.
    One open record (phase_end_date=None) per intern at any time.
    Closing a record (setting phase_end_date) and opening a new one = promotion.
    """

    PHASE_CHOICES = [
        ('PHASE_1',   'Phase 1 — Standard Internship (Months 1–6)'),
        ('PHASE_2',   'Phase 2 — Stipend Internship (Months 7–12)'),
        ('FULL_TIME', 'Full-Time Employment'),
    ]

    intern            = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='employment_stages',
        limit_choices_to={'role': 'INTERN'}
    )
    phase             = models.CharField(max_length=20, choices=PHASE_CHOICES)
    phase_start_date  = models.DateField()
    phase_end_date    = models.DateField(
        null=True, blank=True,
        help_text="Null = currently active phase"
    )

    # Stipend amount (populated only for PHASE_2 and FULL_TIME)
    stipend_amount    = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True
    )

    # Conversion probability at the time of this stage transition
    conversion_score  = models.FloatField(
        null=True, blank=True,
        help_text="ConversionScore.composite_score snapshot at the time of promotion"
    )

    promoted_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='stage_promotions'
    )
    notes             = models.TextField(blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-phase_start_date']
        verbose_name        = 'Employment Stage'
        verbose_name_plural = 'Employment Stages'

    def __str__(self):
        end = self.phase_end_date or 'present'
        return f"{self.intern.email} — {self.get_phase_display()} ({self.phase_start_date} → {end})"


class CertificationCriteria(models.Model):
    """
    Admin-configurable pass/fail thresholds for each phase gate.
    Nullable fields = that metric is not gated for this criteria set.
    Immutable once used in a CertificationRecord (enforced in clean()).
    """

    PHASE_CHOICES = [
        ('PHASE_1', 'Phase 1 Gate'),
        ('PHASE_2', 'Phase 2 Gate'),
        ('PPO',     'PPO Certificate'),
    ]

    phase                 = models.CharField(max_length=10, choices=PHASE_CHOICES)

    # Minimum scores required to pass (null = not evaluated)
    min_overall_score     = models.FloatField(null=True, blank=True)
    min_productivity_score = models.FloatField(null=True, blank=True)
    min_quality_score     = models.FloatField(null=True, blank=True)
    min_engagement_score  = models.FloatField(null=True, blank=True)
    min_attendance_pct    = models.FloatField(null=True, blank=True)
    min_weekly_reports_submitted = models.IntegerField(
        null=True, blank=True,
        help_text="Minimum number of weekly reports the intern must have submitted"
    )

    is_active   = models.BooleanField(
        default=True,
        help_text="Only one active criteria set per phase is used for evaluation"
    )
    description = models.TextField(
        help_text="Human-readable explanation of this criteria set"
    )
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_criteria'
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Certification Criteria'
        verbose_name_plural = 'Certification Criteria'
        ordering            = ['-created_at']

    def __str__(self):
        return f"{self.get_phase_display()} Criteria — {'Active' if self.is_active else 'Inactive'} (created {self.created_at.date()})"

    def clean(self):
        """
        Prevent admin from retroactively editing criteria that have already
        been used in an issued CertificationRecord.
        """
        from django.core.exceptions import ValidationError
        if self.pk:   # Editing an existing criteria set
            if CertificationRecord.objects.filter(
                cert_type=self.phase,
                issue_date__isnull=False,   # Has been issued
                is_revoked=False,
            ).exists():
                raise ValidationError(
                    f"This criteria set has been used in issued certificates. "
                    f"Create a new criteria version instead of editing an existing one. "
                    f"Past certificates use the criteria_snapshot captured at the time of issuance."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

import uuid


class CertificationRecord(models.Model):
    """
    Stores the final result of a successful phase gate evaluation.
    Once issued, this record is considered immutable (except for revocation status).
    """

    CERT_TYPE_CHOICES = [
        ('PHASE_1', 'Internship Completion Certificate'),
        ('PHASE_2', 'Stipend Internship Certificate'),
        ('PPO',     'Pre-Placement Offer Certificate'),
    ]

    unique_cert_id        = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        help_text="Unique identifier for public verification"
    )
    intern                 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    phase_evaluation       = models.OneToOneField(
        'PhaseEvaluation',
        on_delete=models.PROTECT,
        related_name='certificate',
        help_text="Evaluation that triggered this certificate"
    )
    cert_type              = models.CharField(max_length=10, choices=CERT_TYPE_CHOICES)
    issue_date             = models.DateField(auto_now_add=True)

    # Branded PDF file storage
    certificate_file       = models.FileField(
        upload_to='certificates/%Y/%m/',
        null=True, blank=True
    )

    # Score snapshot at the time of issuance
    overall_score_at_issue = models.FloatField()
    scores_snapshot        = models.JSONField(
        default=dict,
        help_text="Full breakdown of metrics at the time of issuance"
    )
    criteria_snapshot      = models.JSONField(
        default=dict,
        help_text="Snapshot of the gate criteria used for this certificate"
    )

    # Revocation controls
    is_revoked             = models.BooleanField(default=False)
    revoked_at             = models.DateTimeField(null=True, blank=True)
    revoked_by             = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='revoked_certificates'
    )
    revocation_reason      = models.TextField(blank=True)

    class Meta:
        verbose_name        = 'Certification Record'
        verbose_name_plural = 'Certification Records'
        ordering            = ['-issue_date']

    def __str__(self):
        return f"{self.intern.email} — {self.get_cert_type_display()} ({self.issue_date})"


class PhaseEvaluation(models.Model):
    """
    Gate evaluation at the end of Phase 1 or Phase 2.
    Records the decision (PROMOTE / EXTEND / DECLINE) and a snapshot
    of scores + criteria at evaluation time so retroactive changes
    cannot invalidate past decisions.
    """

    DECISION_CHOICES = [
        ('PROMOTE', 'Promote to next phase'),
        ('EXTEND',  'Extend current phase'),
        ('DECLINE', 'Decline — end internship'),
    ]

    intern            = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='phase_evaluations',
        limit_choices_to={'role': 'INTERN'}
    )
    employment_stage  = models.ForeignKey(
        EmploymentStage,
        on_delete=models.CASCADE,
        related_name='evaluations'
    )
    evaluated_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='evaluations_conducted'
    )
    evaluated_at      = models.DateTimeField(auto_now_add=True)

    # Scores at the time of evaluation (snapshots — immutable after save)
    overall_score         = models.FloatField(default=0.0)
    productivity_score    = models.FloatField(default=0.0)
    quality_score         = models.FloatField(default=0.0)
    engagement_score      = models.FloatField(default=0.0)
    attendance_pct        = models.FloatField(default=0.0)
    weekly_reports_submitted = models.IntegerField(default=0)

    # AI recommendation (populated by Celery task — nullable until computed)
    ai_recommendation         = models.TextField(blank=True)
    ai_decision_suggestion    = models.CharField(
        max_length=10,
        choices=DECISION_CHOICES,
        blank=True
    )

    # Manager's final decision
    decision      = models.CharField(max_length=10, choices=DECISION_CHOICES)
    manager_notes = models.TextField(blank=True)

    # Frozen copy of the CertificationCriteria used for this evaluation
    # Stored as JSON so future criteria changes don't affect past evaluations
    criteria_snapshot = models.JSONField(
        default=dict,
        help_text="Snapshot of CertificationCriteria thresholds at evaluation time"
    )
    criteria_met      = models.BooleanField(
        default=False,
        help_text="True if all active criteria thresholds were met"
    )

    class Meta:
        ordering            = ['-evaluated_at']
        verbose_name        = 'Phase Evaluation'
        verbose_name_plural = 'Phase Evaluations'

    def __str__(self):
        return (
            f"{self.intern.email} — "
            f"{self.employment_stage.get_phase_display()} — "
            f"{self.get_decision_display()} ({self.evaluated_at.date()})"
        )


class IoTDevice(models.Model):
    """
    Stub model for future IoT biometric device integration.
    Not yet active — registered here so the DB schema is ready
    without requiring code changes when IoT hardware arrives.
    """

    DEVICE_TYPE_CHOICES = [
        ('FINGERPRINT',  'Fingerprint Scanner'),
        ('FACE_RECOG',   'Face Recognition Camera'),
        ('RFID',         'RFID Card Reader'),
        ('QR_SCANNER',   'QR Code Scanner'),
    ]

    device_id    = models.CharField(max_length=100, unique=True)
    device_type  = models.CharField(max_length=20, choices=DEVICE_TYPE_CHOICES)
    location     = models.CharField(
        max_length=200, blank=True,
        help_text="Physical location of the device (e.g., 'Main Entrance', 'Floor 3')"
    )
    is_active    = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'IoT Device'
        verbose_name_plural = 'IoT Devices'

    def __str__(self):
        return f"{self.device_id} ({self.get_device_type_display()}) — {'Active' if self.is_active else 'Inactive'}"


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
    department = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Department this role belongs to (e.g., Engineering, Marketing)"
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


class ResumeSkill(models.Model):
    """
    V2 NEW: Stores normalized skills with categories for granular analysis.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='structured_skills'
    )
    name = models.CharField(max_length=100, help_text="Normalized skill name (e.g., Python)")
    category = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Skill category (e.g., programming_languages, frameworks_libraries)"
    )
    is_major = models.BooleanField(default=False, help_text="Whether this is a primary skill for the role")
    
    class Meta:
        verbose_name = "Resume Skill"
        verbose_name_plural = "Resume Skills"
        unique_together = ['application', 'name', 'category']

    def __str__(self):
        return f"{self.name} ({self.category})"


class ResumeExperience(models.Model):
    """
    V2 NEW: Stores structured work history with dates and quantified achievements.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='structured_experience'
    )
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    start_date = models.CharField(max_length=50, blank=True, null=True, help_text="ISO format or text")
    end_date = models.CharField(max_length=50, blank=True, null=True)
    is_current = models.BooleanField(default=False)
    is_internship = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    technologies = models.JSONField(default=list, blank=True)
    
    class Meta:
        verbose_name = "Resume Experience"
        verbose_name_plural = "Resume Experiences"

    def __str__(self):
        return f"{self.title} at {self.company}"


class ResumeProject(models.Model):
    """
    V2 NEW: Stores project details and tech stacks.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='structured_projects'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    technologies = models.JSONField(default=list, blank=True)
    github_url = models.URLField(max_length=500, blank=True, null=True)
    impact = models.TextField(blank=True, null=True, help_text="Quantified impact or key results")
    
    class Meta:
        verbose_name = "Resume Project"
        verbose_name_plural = "Resume Projects"

    def __str__(self):
        return self.name


class ResumeEducation(models.Model):
    """
    V2 NEW: Stores structured education details.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='structured_education'
    )
    degree = models.CharField(max_length=200)
    field_of_study = models.CharField(max_length=200, blank=True, null=True)
    institution = models.CharField(max_length=200)
    start_year = models.IntegerField(null=True, blank=True)
    end_year = models.IntegerField(null=True, blank=True)
    gpa = models.FloatField(null=True, blank=True)
    honors = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Resume Education"
        verbose_name_plural = "Resume Education Entries"

    def __str__(self):
        return f"{self.degree} from {self.institution}"


class ResumeCertification(models.Model):
    """
    V2 NEW: Stores structured certification data.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='structured_certifications'
    )
    name = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255, blank=True, null=True)
    date = models.CharField(max_length=50, blank=True, null=True)
    
    class Meta:
        verbose_name = "Resume Certification"
        verbose_name_plural = "Resume Certifications"

    def __str__(self):
        return self.name


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


# ============================================================================
# RL DYNAMIC TASK ASSIGNMENT & LEARNING PATH OPTIMIZATION MODELS
# ============================================================================


class SkillProfile(models.Model):
    """
    Tracks intern skill mastery for the RL agent state representation.
    Updated whenever a task is completed or a milestone is reached.
    """
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='skill_profiles',
        limit_choices_to={'role': 'INTERN'}
    )
    skill_name = models.CharField(max_length=100, help_text="Normalized skill name (e.g., Python, Django)")
    mastery_level = models.FloatField(
        default=0.0,
        help_text="Skill mastery level (0.0–1.0). 0=no knowledge, 1=expert."
    )
    learning_rate = models.FloatField(
        default=0.1,
        help_text="How quickly the intern learns this skill (0.0–1.0)."
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['intern', 'skill_name']
        ordering = ['-mastery_level']
        verbose_name = "Skill Profile"
        verbose_name_plural = "Skill Profiles"

    def __str__(self):
        return f"{self.intern.email} | {self.skill_name} ({self.mastery_level:.2f})"


class TaskTemplate(models.Model):
    """
    Library of reusable task templates with RL-relevant metadata.
    Used by the RL agent as the action space for task recommendations.
    """
    DIFFICULTY_CHOICES = [(i, str(i)) for i in range(1, 6)]

    ACTION_TYPE_CHOICES = [
        ('EASY_TASK', 'Easy Task (Difficulty 1-2)'),
        ('MODERATE_TASK', 'Moderate Task (Difficulty 3)'),
        ('HARD_TASK', 'Hard Task (Difficulty 4-5)'),
        ('SKILL_GAP_TASK', 'Skill Gap Focus Task'),
        ('COLLABORATION_TASK', 'Collaboration/Team Task'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    difficulty = models.IntegerField(choices=DIFFICULTY_CHOICES, help_text="Task difficulty level (1=easiest, 5=hardest)")
    action_type = models.CharField(max_length=25, choices=ACTION_TYPE_CHOICES, default='MODERATE_TASK')

    # Skills this task develops
    skills_required = models.JSONField(default=list, help_text="List of skill names required/developed by this task")

    # Time estimate
    estimated_hours = models.FloatField(default=4.0, help_text="Estimated hours to complete")

    # RL-specific metadata
    success_probability = models.FloatField(
        default=0.5,
        help_text="Baseline probability of successful completion (0.0–1.0)"
    )
    learning_value = models.FloatField(
        default=0.5,
        help_text="Expected learning value / skill growth potential (0.0–1.0)"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['difficulty', 'title']
        verbose_name = "Task Template"
        verbose_name_plural = "Task Templates"

    def __str__(self):
        return f"[D{self.difficulty}] {self.title}"


class LearningPath(models.Model):
    """
    Personalized learning path generated for an intern targeting a specific job role.
    Uses A* over the skill dependency graph to order milestones optimally.
    """
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='learning_paths',
        limit_choices_to={'role': 'INTERN'}
    )
    job_role = models.ForeignKey(
        'JobRole',
        on_delete=models.CASCADE,
        related_name='learning_paths',
        null=True,
        blank=True
    )
    target_role_title = models.CharField(
        max_length=100,
        blank=True,
        help_text="Cached role title for display without FK join"
    )

    # Ordered milestone list: [{skill, difficulty, estimated_hours, resources, description}]
    milestones = models.JSONField(default=list, help_text="Ordered list of skill milestones to complete")

    # Pointer to the current step
    current_position = models.IntegerField(default=0, help_text="Index into milestones list (0-based)")

    # Completion tracking
    completed_milestones = models.JSONField(default=list, help_text="List of completed milestone skill names")
    completion_percentage = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # One active path per intern per role
        unique_together = ['intern', 'job_role']
        ordering = ['-updated_at']
        verbose_name = "Learning Path"
        verbose_name_plural = "Learning Paths"

    def __str__(self):
        role = self.target_role_title or (self.job_role.role_title if self.job_role else 'Unknown')
        return f"{self.intern.email} → {role} ({self.completion_percentage:.0f}%)"


class RLExperienceBuffer(models.Model):
    """
    Stores (state, action, reward, next_state, done) experience tuples for RL training.
    Supports experience replay to improve the DQN/Q-Learning policy stability.
    """
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rl_experiences',
        limit_choices_to={'role': 'INTERN'}
    )

    # RL tuple components
    state = models.JSONField(help_text="State vector at time of action (intern feature vector)")
    action = models.CharField(max_length=50, help_text="Action taken (task difficulty or action type)")
    reward = models.FloatField(help_text="Reward received after action")
    next_state = models.JSONField(help_text="State vector after action was taken")
    done = models.BooleanField(default=False, help_text="Whether this was a terminal transition")

    # Context for debugging / analysis
    task_ref = models.ForeignKey(
        'TaskTracking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rl_experiences',
        help_text="Task this experience relates to"
    )
    reward_breakdown = models.JSONField(
        default=dict,
        help_text="Component-wise reward breakdown {completion, quality, growth, engagement, overdue}"
    )

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "RL Experience Buffer"
        verbose_name_plural = "RL Experience Buffer"

    def __str__(self):
        return f"{self.intern.email} | {self.action} | R={self.reward:.2f} @ {self.timestamp}"


class QTable(models.Model):
    """
    Persists Q-values for the RL agent. 
    Map of (intern, state_key, action) -> q_value.
    """
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='q_tables',
        limit_choices_to={'role': 'INTERN'}
    )
    state_key = models.CharField(max_length=255, help_text="Discrete state representation (e.g., '1|2|3...')")
    action = models.CharField(max_length=50, help_text="Action name (e.g., 'EASY_TASK')")
    q_value = models.FloatField(default=1.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['intern', 'state_key', 'action']
        indexes = [
            models.Index(fields=['intern', 'state_key'], name='idx_qtable_lookup'),
        ]
        verbose_name = "Q-Table"
        verbose_name_plural = "Q-Tables"

    def __str__(self):
        return f"{self.intern.email} | {self.state_key} | {self.action} = {self.q_value:.4f}"


class RLAgentState(models.Model):
    """
    Stores per-intern RL agent hyper-parameters and meta-state.
    """
    intern = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rl_state',
        limit_choices_to={'role': 'INTERN'}
    )
    epsilon = models.FloatField(default=0.8, help_text="Current exploration rate (epsilon)")
    total_episodes = models.IntegerField(default=0, help_text="Number of tasks completed / policy updates")
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "RL Agent State"
        verbose_name_plural = "RL Agent States"

    def __str__(self):
        return f"{self.intern.email} | ε={self.epsilon:.3f} | Episodes={self.total_episodes}"

class WeeklyReportV2(models.Model):
    """
    V2 Automated Weekly Report Engine.
    Stores system-generated reports (is_auto_generated=True) 
    and intern self-submitted reports (is_auto_generated=False).
    """

    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weekly_reports_v2'
    )
    week_start = models.DateField()           # Always a Monday
    week_end = models.DateField()             # Always the following Sunday
    week_number = models.IntegerField()       # Sequential week in intern's current phase (1–26)
    is_auto_generated = models.BooleanField(default=False)   # True = system, False = intern-submitted

    # ── Task metrics for the week ──────────────────────────────────────────────
    tasks_assigned = models.IntegerField(default=0)
    tasks_completed = models.IntegerField(default=0)
    tasks_in_progress = models.IntegerField(default=0)
    tasks_overdue = models.IntegerField(default=0)
    avg_task_quality_rating = models.FloatField(null=True, blank=True)   # 0–5 rating scale
    total_estimated_hours = models.FloatField(default=0)
    total_actual_hours = models.FloatField(default=0)
    hour_variance_pct = models.FloatField(null=True, blank=True)   # (actual - estimated) / estimated × 100

    # ── Attendance for the week ────────────────────────────────────────────────
    attendance_days = models.IntegerField(default=0)
    expected_days = models.IntegerField(default=5)
    late_check_ins = models.IntegerField(default=0)
    attendance_pct = models.FloatField(default=0.0)   # attendance_days / expected_days × 100

    # ── Performance scores (this week only) ───────────────────────────────────
    productivity_score = models.FloatField(null=True, blank=True)
    quality_score = models.FloatField(null=True, blank=True)
    engagement_score = models.FloatField(null=True, blank=True)
    growth_score = models.FloatField(null=True, blank=True)
    overall_weekly_score = models.FloatField(null=True, blank=True)

    # ── Week-over-week deltas (positive = improving) ───────────────────────────
    productivity_delta = models.FloatField(null=True, blank=True)
    quality_delta = models.FloatField(null=True, blank=True)
    overall_delta = models.FloatField(null=True, blank=True)

    # ── Phase cumulative running average at end of this week ──────────────────
    cumulative_overall_score = models.FloatField(null=True, blank=True)

    # ── AI-generated narrative (Groq — populated async after report creation) ─
    ai_narrative = models.TextField(blank=True)           # 3-sentence summary
    ai_top_achievement = models.CharField(max_length=500, blank=True)
    ai_concern_area = models.CharField(max_length=500, blank=True)
    ai_growth_note = models.CharField(max_length=500, blank=True)

    # ── Red flags ─────────────────────────────────────────────────────────────
    red_flag = models.BooleanField(default=False)
    red_flag_reasons = models.JSONField(default=list)   # List of human-readable strings

    # ── Self-report cross-reference ────────────────────────────────────────────
    # For auto-generated reports: FK to the intern-submitted report for the same week (if exists)
    intern_self_report = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_counterpart'
    )
    self_report_mismatch = models.BooleanField(default=False)
    self_report_mismatch_details = models.JSONField(default=list)   # List of discrepancy strings

    # ── Manager review ─────────────────────────────────────────────────────────
    manager_reviewed = models.BooleanField(default=False)
    manager_comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_reports_v2'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-week_start']
        # One system report + one intern report max per week per intern
        unique_together = [['intern', 'week_start', 'is_auto_generated']]
        verbose_name = "Weekly Report V2"
        verbose_name_plural = "Weekly Reports V2"

    def __str__(self):
        kind = 'Auto' if self.is_auto_generated else 'Intern'
        return f"{self.intern.email} — Week {self.week_number} ({self.week_start}) [{kind}]"

    @property
    def completion_rate(self):
        """Tasks completed as a percentage of tasks assigned."""
        if not self.tasks_assigned:
            return 0.0
        return round((self.tasks_completed / self.tasks_assigned) * 100, 1)

    @property
    def hour_efficiency(self):
        """Positive = came in under estimated hours; negative = over-ran."""
        if not self.total_estimated_hours:
            return None
        return round(
            ((self.total_estimated_hours - self.total_actual_hours) / self.total_estimated_hours) * 100, 1
        )


class ConversionScore(models.Model):
    """
    12-month ML aggregate score for the full-time offer decision.
    One record per intern — updated in-place every Monday via Celery Beat.
    auto_now=True on computed_at means every save updates the timestamp.
    """
    intern       = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversion_score'
    )
    computed_at  = models.DateTimeField(auto_now=True)

    # ── Component scores (weighted ensemble) ──────────────────────────────────
    # Is performance IMPROVING over the 12-month window?
    performance_trend_score    = models.FloatField(default=0.0)

    # Absolute level — average of all WeeklyReport overall_weekly_score
    absolute_performance_score = models.FloatField(default=0.0)

    # Skills gained relative to skill set at Phase 1 start
    skill_growth_delta         = models.FloatField(default=0.0)

    # NLP sentiment trend over all manager feedback + comments
    manager_sentiment_trend    = models.FloatField(default=0.0)

    # Percentile rank within the intern's cohort (0–100)
    peer_comparison_percentile = models.FloatField(default=0.0)

    # ── Final composite ────────────────────────────────────────────────────────
    # Weighted combination: 0.30 / 0.25 / 0.20 / 0.15 / 0.10
    composite_score            = models.FloatField(default=0.0)

    # ── Audit trail ───────────────────────────────────────────────────────────
    model_version   = models.CharField(max_length=20, default='v1.0')
    feature_vector  = models.JSONField(default=dict)   # Input features stored for audit/retraining

    class Meta:
        ordering = ['-computed_at']

    def __str__(self):
        return f"{self.intern.email} — {self.composite_score:.1f}% (v{self.model_version})"
