from django.db import models
from apps.accounts.models import User

class Assessment(models.Model):
    TYPE_CHOICES = [
        ('TECHNICAL', 'Technical Quiz'),
        ('CODING', 'Coding Challenge'),
        ('BEHAVIORAL', 'Behavioral'),
        ('PROJECT', 'Project Evaluation'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assessment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_assessments')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_assessment_type_display()})"


class AssessmentSubmission(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='submissions')
    intern = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessment_submissions', limit_choices_to={'role': User.Role.INTERN})
    
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True) # e.g. 85.50
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    
    submission_data = models.JSONField(default=dict, blank=True) # For quiz answers or code URL
    feedback = models.TextField(blank=True)
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.intern.full_name} - {self.assessment.title}"
