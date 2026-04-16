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
