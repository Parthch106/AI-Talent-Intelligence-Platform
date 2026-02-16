import os
from django.db import models
from django.utils import timezone
from apps.accounts.models import User


def get_document_upload_path(instance, filename):
    """
    Generate upload path based on document_type.
    Files will be stored in: resume/<filename> for resumes
    """
    # Get the document type
    doc_type = instance.document_type
    
    # For resumes, store directly in resume folder
    if doc_type == 'RESUME':
        return os.path.join('resume', filename)
    
    # For other documents, use documents/<type> path
    return os.path.join('documents', doc_type.lower(), filename)


class Document(models.Model):
    # Intern document types
    RESUME = 'RESUME', 'Resume'
    GOVERNMENT_ID = 'GOVERNMENT_ID', 'Government ID'
    ACADEMIC_CERTIFICATE = 'ACADEMIC_CERTIFICATE', 'Academic Certificate'
    INTERNSHIP_CERTIFICATE = 'INTERNSHIP_CERTIFICATE', 'Internship Certificate'
    PROJECT_REPORT = 'PROJECT_REPORT', 'Project Report'
    PRESENTATION = 'PRESENTATION', 'Presentation'
    CODE_REPO_LINK = 'CODE_REPO_LINK', 'Code Repository Link'
    PROJECT_COMPLETION = 'PROJECT_COMPLETION', 'Project Completion Evidence'
    WEEKLY_PROGRESS = 'WEEKLY_PROGRESS', 'Weekly Progress Report'
    TASK_SUBMISSION = 'TASK_SUBMISSION', 'Task Submission'
    SELF_ASSESSMENT = 'SELF_ASSESSMENT', 'Self Assessment Report'
    RECOMMENDATION_LETTER = 'RECOMMENDATION_LETTER', 'Recommendation Letter'
    ACHIEVEMENT_CERTIFICATE = 'ACHIEVEMENT_CERTIFICATE', 'Achievement Certificate'
    
    # Manager document types
    FEEDBACK_REPORT = 'FEEDBACK_REPORT', 'Feedback Report'
    PERFORMANCE_REVIEW = 'PERFORMANCE_REVIEW', 'Performance Review'
    MONTHLY_ASSESSMENT = 'MONTHLY_ASSESSMENT', 'Monthly Assessment'
    PROJECT_ASSIGNMENT = 'PROJECT_ASSIGNMENT', 'Project Assignment Brief'
    REQUIREMENT_DOC = 'REQUIREMENT_DOC', 'Requirement Document'
    SOP_GUIDELINES = 'SOP_GUIDELINES', 'SOP/Guidelines'
    MENTOR_NOTES = 'MENTOR_NOTES', 'Mentor Notes'
    IMPROVEMENT_PLAN = 'IMPROVEMENT_PLAN', 'Improvement Plan'
    
    # Admin document types
    INTERNSHIP_POLICY = 'INTERNSHIP_POLICY', 'Internship Policy'
    CODE_OF_CONDUCT = 'CODE_OF_CONDUCT', 'Code of Conduct'
    NDA_TEMPLATE = 'NDA_TEMPLATE', 'NDA Template'
    TALENT_REPORT = 'TALENT_REPORT', 'Talent Report'
    ANALYTICS_EXPORT = 'ANALYTICS_EXPORT', 'Analytics Export'
    AUDIT_LOG = 'AUDIT_LOG', 'Audit Log'
    BULK_USER_UPLOAD = 'BULK_USER_UPLOAD', 'Bulk User Upload CSV'
    ROLE_CONFIG = 'ROLE_CONFIG', 'Role Configuration'
    
    TYPE_CHOICES = [
        # Intern types
        ('RESUME', 'Resume'),
        ('GOVERNMENT_ID', 'Government ID'),
        ('ACADEMIC_CERTIFICATE', 'Academic Certificate'),
        ('INTERNSHIP_CERTIFICATE', 'Internship Certificate'),
        ('PROJECT_REPORT', 'Project Report'),
        ('PRESENTATION', 'Presentation'),
        ('CODE_REPO_LINK', 'Code Repository Link'),
        ('PROJECT_COMPLETION', 'Project Completion Evidence'),
        ('WEEKLY_PROGRESS', 'Weekly Progress Report'),
        ('TASK_SUBMISSION', 'Task Submission'),
        ('SELF_ASSESSMENT', 'Self Assessment Report'),
        ('RECOMMENDATION_LETTER', 'Recommendation Letter'),
        ('ACHIEVEMENT_CERTIFICATE', 'Achievement Certificate'),
        
        # Manager types
        ('FEEDBACK_REPORT', 'Feedback Report'),
        ('PERFORMANCE_REVIEW', 'Performance Review'),
        ('MONTHLY_ASSESSMENT', 'Monthly Assessment'),
        ('PROJECT_ASSIGNMENT', 'Project Assignment Brief'),
        ('REQUIREMENT_DOC', 'Requirement Document'),
        ('SOP_GUIDELINES', 'SOP/Guidelines'),
        ('MENTOR_NOTES', 'Mentor Notes'),
        ('IMPROVEMENT_PLAN', 'Improvement Plan'),
        
        # Admin types
        ('INTERNSHIP_POLICY', 'Internship Policy'),
        ('CODE_OF_CONDUCT', 'Code of Conduct'),
        ('NDA_TEMPLATE', 'NDA Template'),
        ('TALENT_REPORT', 'Talent Report'),
        ('ANALYTICS_EXPORT', 'Analytics Export'),
        ('AUDIT_LOG', 'Audit Log'),
        ('BULK_USER_UPLOAD', 'Bulk User Upload CSV'),
        ('ROLE_CONFIG', 'Role Configuration'),
        
        # Common types
        ('OFFER_LETTER', 'Offer Letter'),
        ('NDA', 'NDA'),
        ('OTHER', 'Other'),
    ]
    
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    file = models.FileField(upload_to=get_document_upload_path)
    
    # Resume parsing fields
    raw_text = models.TextField(blank=True, null=True, help_text="Extracted raw text from the document")
    is_parsed = models.BooleanField(default=False, help_text="Whether the document has been parsed")
    
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_documents')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_documents', null=True, blank=True)
    
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"


class ResumeData(models.Model):
    """
    Stores structured parsed data from resumes.
    This model holds the extracted information from resume documents.
    """
    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name='resume_data',
        limit_choices_to={'document_type': 'RESUME'}
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='resume_data'
    )
    
    # Phase 2 - Part 1: Applied Role
    ROLE_CHOICES = [
        ('FRONTEND_DEVELOPER', 'Frontend Developer'),
        ('BACKEND_DEVELOPER', 'Backend Developer'),
        ('FULLSTACK_DEVELOPER', 'Fullstack Developer'),
        ('DATA_SCIENTIST', 'Data Scientist'),
        ('ML_ENGINEER', 'Machine Learning Engineer'),
        ('DEVOPS_ENGINEER', 'DevOps Engineer'),
        ('MOBILE_DEVELOPER', 'Mobile Developer'),
        ('QA_ENGINEER', 'QA Engineer'),
        ('UI_UX_DESIGNER', 'UI/UX Designer'),
        ('PRODUCT_MANAGER', 'Product Manager'),
    ]
    applied_role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        blank=True,
        null=True,
        help_text="Role the candidate is applying for"
    )
    
    # Personal Information
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    
    # Skills (stored as JSONB for flexible querying)
    skills = models.JSONField(default=list, blank=True, help_text="List of skills extracted from resume")
    
    # Education (stored as JSONB)
    education = models.JSONField(default=list, blank=True, help_text="List of education entries")
    # Expected format: [{"degree": "", "institution": "", "year": "", "gpa": ""}]
    
    # Phase 2 - Part 1: Years of Education
    years_of_education = models.FloatField(
        default=0.0,
        help_text="Total years of formal education"
    )
    
    # Experience (stored as JSONB)
    experience = models.JSONField(default=list, blank=True, help_text="List of work experience entries")
    # Expected format: [{"title": "", "company": "", "start_date": "", "end_date": "", "description": ""}]
    
    # Projects (stored as JSONB)
    projects = models.JSONField(default=list, blank=True, help_text="List of projects")
    # Expected format: [{"name": "", "description": "", "technologies": []}]
    
    # Certifications (stored as JSONB)
    certifications = models.JSONField(default=list, blank=True, help_text="List of certifications")
    # Expected format: [{"name": "", "issuer": "", "date": ""}]
    
    # Tools/Technologies (stored as JSONB)
    tools = models.JSONField(default=list, blank=True, help_text="List of tools and technologies")
    
    # Phase 2 - Part 1: Prior Internship Experience
    has_internship_experience = models.BooleanField(
        default=False,
        help_text="Whether the candidate has prior internship experience"
    )
    internship_count = models.IntegerField(
        default=0,
        help_text="Number of internships completed"
    )
    
    # Calculated fields
    total_experience_years = models.FloatField(default=0.0, help_text="Total years of experience")
    
    # Metadata
    parsed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Resume Data"
        verbose_name_plural = "Resume Data"
        ordering = ['-parsed_at']
    
    def __str__(self):
        return f"Resume Data for {self.name or self.user.email}"
