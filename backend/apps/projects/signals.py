"""
Signals for project assignments and notifications.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


def connect_project_assignment_signals():
    """Connect ProjectAssignment signals - call this from AppConfig.ready()"""
    from apps.projects.models import ProjectAssignment
    
    @receiver(post_save, sender=ProjectAssignment)
    def project_assignment_created(sender, instance, created, **kwargs):
        """
        Create notifications when an intern is assigned to a project.
        """
        if not created:
            return
            
        try:
            _notify_intern_assignment(instance)
            _notify_manager_new_assignment(instance)
        except Exception as e:
            logger.error(f"Error in project assignment notification: {str(e)}")


def _notify_intern_assignment(assignment):
    """Notify intern when they are assigned to a project."""
    try:
        from apps.notifications.models import Notification
        
        Notification.objects.create(
            user=assignment.intern,
            notification_type='INTERN_ASSIGNED',
            title='New Project Assignment',
            message=f'You have been assigned to project "{assignment.project.title}".',
        )
        logger.info(f"Sent assignment notification to intern {assignment.intern.email}")
    except Exception as e:
        logger.error(f"Error sending intern assignment notification: {str(e)}")


def _notify_manager_new_assignment(assignment):
    """Notify manager when a new intern is assigned to their project."""
    try:
        from apps.notifications.models import Notification
        
        if assignment.project.mentor:
            Notification.objects.create(
                user=assignment.project.mentor,
                notification_type='INFO',
                title='New Intern Assigned',
                message=f'{assignment.intern.full_name} has been assigned to your project "{assignment.project.title}".',
            )
    except Exception as e:
        logger.error(f"Error sending manager assignment notification: {str(e)}")
