from django.db import models
from apps.accounts.models import User

class InternProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='intern_profile')
    phone_number = models.CharField(max_length=15, blank=True)
    university = models.CharField(max_length=255, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    graduation_year = models.IntegerField(null=True, blank=True)
    github_profile = models.URLField(blank=True, null=True)
    linkedin_profile = models.URLField(blank=True, null=True)
    skills = models.JSONField(default=list, blank=True)
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('FORMER', 'Former'),
        ('OFFERED', 'Offered'),
        ('REJECTED', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.full_name}'s Profile"
