from django.db import models
from apps.accounts.models import User

class Document(models.Model):
    TYPE_CHOICES = [
        ('RESUME', 'Resume'),
        ('OFFER_LETTER', 'Offer Letter'),
        ('NDA', 'NDA'),
        ('PROJECT_SPEC', 'Project Specification'),
        ('REPORT', 'Report'),
        ('OTHER', 'Other'),
    ]
    
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    file = models.FileField(upload_to='documents/')
    
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_documents')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_documents', null=True, blank=True)
    
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"
