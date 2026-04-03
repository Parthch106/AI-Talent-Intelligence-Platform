from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Model to store user notifications.
    """
    NOTIFICATION_TYPES = [
        ('INFO', 'Information'),
        ('SUCCESS', 'Success'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('INTERN_ASSIGNED', 'Intern Assigned'),
        ('TASK_ASSIGNED', 'Task Assigned'),
        ('TASK_SUBMITTED', 'Task Submitted'),
        ('TASK_EVALUATED', 'Task Evaluated'),
        ('TASK_COMPLETED', 'Task Completed'),
        ('FEEDBACK_RECEIVED', 'Feedback Received'),
        ('FEEDBACK_GIVEN', 'Feedback Given'),
        ('REPORT_UPLOADED', 'Report Uploaded'),
        ('EVALUATION_DUE', 'Evaluation Due'),
        ('DEADLINE_REMINDER', 'Deadline Reminder'),
        ('SYSTEM', 'System Notification'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default='INFO'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.email}"


class SystemActivity(models.Model):
    """
    Model to track system-wide activities for the activity log.
    """
    ACTIVITY_TYPES = [
        ('USER_REGISTERED', 'User Registered'),
        ('INTERN_ASSIGNED', 'Intern Assigned to Project'),
        ('TASK_COMPLETED', 'Task Completed'),
        ('EVALUATION_SUBMITTED', 'Evaluation Submitted'),
        ('INTELLIGENCE_COMPUTED', 'Intelligence Computed'),
        ('DOCUMENT_UPLOADED', 'Document Uploaded'),
        ('SYSTEM_UPDATE', 'System Update'),
    ]

    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.activity_type} - {self.created_at}"
