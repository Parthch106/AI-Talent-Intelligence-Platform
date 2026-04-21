from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        INTERN = "INTERN", "Intern"
        MANAGER = "MANAGER", "Manager"
        ADMIN = "ADMIN", "Admin"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.INTERN
    )
    department = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"

    def get_full_name(self):
        return self.full_name or self.email


# ============================================================================
# V2 — InternProfile: Career Progression State Machine
# ============================================================================

class InternProfile(models.Model):
    """
    One-to-one extension of User for intern-specific V2 career progression data.
    status drives which phase the intern is in and which automated pipelines activate.
    """

    STATUS_CHOICES = [
        ('APPLIED',          'Applied'),
        ('OFFERED',          'Offered'),
        ('ACTIVE_INTERN',    'Active Intern — Phase 1'),   # Standard 6-month internship
        ('PHASE_1_COMPLETE', 'Phase 1 Complete'),
        ('STIPEND_INTERN',   'Stipend Intern — Phase 2'),  # Paid 6-month internship
        ('PHASE_2_COMPLETE', 'Phase 2 Complete'),
        ('PPO_OFFERED',      'Pre-Placement Offer Issued'),
        ('FULL_TIME',        'Full-Time Employee'),
        ('NOT_CONVERTED',    'Not Converted'),
        ('FORMER',           'Former Intern'),
    ]

    user             = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='internprofile'
    )
    status           = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE_INTERN'
    )
    join_date        = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    actual_end_date  = models.DateField(null=True, blank=True)

    # Manager assigned to this intern
    assigned_manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_interns',
        limit_choices_to={'role': 'MANAGER'},
    )

    # Admin notes (used for offboarding reasons, hold notes, etc.)
    notes            = models.TextField(blank=True)

    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Intern Profile'
        verbose_name_plural = 'Intern Profiles'

    def __str__(self):
        return f"{self.user.email} — {self.get_status_display()}"


# ============================================================================
# Phase 5 — Full-Time Offers & Stipend
# ============================================================================

from apps.analytics.models import ConversionScore   # Cross-app FK

class FullTimeOffer(models.Model):

    STATUS_CHOICES = [
        ('DRAFT',    'Draft'),
        ('ISSUED',   'Issued to intern'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('EXPIRED',  'Expired'),
    ]

    intern           = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='full_time_offer'
    )
    conversion_score = models.ForeignKey(
        ConversionScore,
        on_delete=models.PROTECT,
        related_name='offers'
    )
    issued_by        = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='offers_issued'
    )
    issued_at        = models.DateTimeField(null=True, blank=True)
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    # ── Role recommendation ────────────────────────────────────────────────────
    # Admin fills these after reviewing the AI suggestion
    recommended_role_title = models.CharField(max_length=200, blank=True)
    recommended_department = models.CharField(max_length=200, blank=True)
    salary_band_min        = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_band_max        = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # ── AI-generated components ────────────────────────────────────────────────
    # Populated async by generate_onboarding_plan Celery task
    ai_onboarding_plan = models.TextField(blank=True)
    ai_offer_summary   = models.TextField(blank=True)   # Offer rationale

    # ── Intern response ────────────────────────────────────────────────────────
    response_deadline  = models.DateField(null=True, blank=True)
    intern_response_at = models.DateTimeField(null=True, blank=True)
    intern_response_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.intern.username} — PPO ({self.get_status_display()})"

    @property
    def is_active(self):
        """Offer is active if issued and not yet responded to or expired."""
        return self.status == 'ISSUED'

    def issue(self, issued_by_user):
        """Transition DRAFT → ISSUED and set issued metadata."""
        from django.utils import timezone
        self.status    = 'ISSUED'
        self.issued_by = issued_by_user
        self.issued_at = timezone.now()
        self.save(update_fields=['status', 'issued_by', 'issued_at', 'updated_at'])


class StipendRecord(models.Model):

    STATUS_CHOICES = [
        ('PENDING',   'Pending approval'),
        ('APPROVED',  'Approved'),
        ('DISBURSED', 'Disbursed'),
        ('HELD',      'On hold'),
    ]

    intern      = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='stipend_records'
    )
    month       = models.DateField()   # Always the first day of the month (e.g., 2026-07-01)
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_stipends'
    )
    approved_at  = models.DateTimeField(null=True, blank=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    notes        = models.TextField(blank=True)

    # Snapshot of intern's performance score at time of disbursement
    performance_score_at_disbursement = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = [['intern', 'month']]
        ordering = ['-month']

    def __str__(self):
        return (
            f"{self.intern.username} — "
            f"{self.month.strftime('%B %Y')} — "
            f"₹{self.amount} ({self.get_status_display()})"
        )
