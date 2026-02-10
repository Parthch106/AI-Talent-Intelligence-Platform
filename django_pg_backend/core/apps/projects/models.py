from django.db import models
from apps.accounts.models import User

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    
    repository_url = models.URLField(blank=True, null=True)
    tech_stack = models.JSONField(default=list, blank=True)
    
    mentor = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='mentored_projects',
        limit_choices_to={'role': User.Role.MANAGER}
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProjectAssignment(models.Model):
    project = models.ForeignKey(Project, related_name='assignments', on_delete=models.CASCADE)
    intern = models.ForeignKey(
        User, 
        related_name='assigned_projects', 
        on_delete=models.CASCADE,
        limit_choices_to={'role': User.Role.INTERN}
    )
    role = models.CharField(max_length=100, blank=True) # e.g. "Frontend Developer"
    assigned_at = models.DateField(auto_now_add=True)
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('DROPPED', 'Dropped'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    class Meta:
        unique_together = ('project', 'intern')

    def __str__(self):
        return f"{self.intern.full_name} -> {self.project.name}"
