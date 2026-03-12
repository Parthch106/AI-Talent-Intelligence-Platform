from django.db import models
from apps.accounts.models import User
from apps.projects.models import Project


class Feedback(models.Model):
    FEEDBACK_TYPE_CHOICES = [
        ('WEEKLY', 'Weekly Check-in'),
        ('PROJECT', 'Project Review'),
        ('MID_TERM', 'Mid-term Evaluation'),
        ('FINAL', 'Final Evaluation'),
        ('MANAGER_REVIEW', 'Manager Review'),
        ('TASK', 'Task Feedback'),
    ]
    
    TASK_STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED_APPROVED', 'Complete - Approved'),
        ('COMPLETED_REWORK', 'Complete - Needs Rework'),
    ]
    
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_feedback')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_feedback')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Task association (new field)
    task = models.ForeignKey(
        'analytics.TaskTracking', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='feedbacks'
    )
    task_status = models.CharField(
        max_length=25, 
        choices=TASK_STATUS_CHOICES, 
        null=True, 
        blank=True,
        help_text='Status of the task being reviewed'
    )
    
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPE_CHOICES)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True)
    
    comments = models.TextField()
    areas_for_improvement = models.TextField(blank=True)
    strengths = models.TextField(blank=True)
    
    # Read tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        task_info = f" - Task: {self.task.title}" if self.task else ""
        return f"Feedback for {self.recipient.full_name} by {self.reviewer.full_name}{task_info}"
