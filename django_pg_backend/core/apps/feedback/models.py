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
    ]
    
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_feedback')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_feedback')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPE_CHOICES)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)]) # 1-5 scale
    
    comments = models.TextField()
    areas_for_improvement = models.TextField(blank=True)
    strengths = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Feedback for {self.recipient.full_name} by {self.reviewer.full_name}"
