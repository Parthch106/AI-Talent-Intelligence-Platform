"""
Signals for automatic intelligence computation and notifications.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.documents.models import ResumeData
from apps.analytics.services import AnalyticsDashboardService
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ResumeData)
def compute_intelligence_on_resume_save(sender, instance, created, **kwargs):
    """
    Automatically compute intelligence when resume data is saved.
    """
    try:
        # Only compute if the user is an intern
        if instance.user.role == 'INTERN':
            analytics_service = AnalyticsDashboardService()
            result = analytics_service.compute_intern_intelligence(instance.user.id)
            
            if result:
                logger.info(
                    f"Successfully computed intelligence for {instance.user.email} "
                    f"after resume data {'creation' if created else 'update'}"
                )
                # Send notification to intern
                _send_intelligence_notification(instance.user)
            else:
                logger.warning(
                    f"Failed to compute intelligence for {instance.user.email} "
                    f"after resume data {'creation' if created else 'update'}"
                )
    except Exception as e:
        logger.error(
            f"Error computing intelligence for {instance.user.email}: {str(e)}"
        )


def _send_intelligence_notification(user):
    """Send notification when intelligence is computed."""
    try:
        from apps.notifications.models import Notification
        from apps.analytics.models import InternIntelligence
        
        # Get the latest intelligence score if available
        intelligence = InternIntelligence.objects.filter(user=user).first()
        score = None
        if intelligence and intelligence.overall_score is not None:
            score = intelligence.overall_score * 100
        
        message = 'Your intelligence analysis has been completed.'
        if score is not None:
            message = f'Your intelligence analysis is ready. Overall suitability score: {score:.1f}%.'
        
        Notification.objects.create(
            user=user,
            notification_type='SYSTEM',
            title='Intelligence Analysis Complete',
            message=message,
        )
    except Exception as e:
        logger.error(f"Error sending intelligence notification: {str(e)}")


# ============================================================================
# Task Tracking Signals - Connected via AppConfig.ready() in apps.py
# ============================================================================

def connect_task_tracking_signals():
    """Connect TaskTracking signals - call this from AppConfig.ready()"""
    from django.db.models.signals import post_save
    from django.dispatch import receiver
    from apps.analytics.models import TaskTracking
    
    @receiver(post_save, sender=TaskTracking)
    def task_status_changed(sender, instance, created, **kwargs):
        """
        Create notifications when task status changes.
        """
        try:
            # Skip if it's a new task (created) - we only notify on status changes
            if created:
                return
            
            if instance.status == 'COMPLETED':
                _notify_task_completed(instance)
            elif instance.status == 'IN_PROGRESS':
                _notify_task_started(instance)
        except Exception as e:
            logger.error(f"Error in task status notification: {str(e)}")


def _notify_task_completed(task):
    """Send notification when a task is completed."""
    try:
        from apps.notifications.models import Notification
        from apps.accounts.models import User
        
        # Notify the intern that their task was completed
        Notification.objects.create(
            user=task.intern,
            notification_type='TASK_COMPLETED',
            title='Task Completed',
            message=f'Your task "{task.title}" has been marked as completed.',
        )
        
        # Also notify managers
        if task.intern.department:
            managers = User.objects.filter(
                role=User.Role.MANAGER,
                department=task.intern.department
            )
            for manager in managers:
                Notification.objects.create(
                    user=manager,
                    notification_type='TASK_COMPLETED',
                    title='Intern Task Completed',
                    message=f'{task.intern.full_name} completed task: "{task.title}".',
                )
    except Exception as e:
        logger.error(f"Error sending task completion notification: {str(e)}")


def _notify_task_started(task):
    """Send notification when a task moves to in-progress."""
    try:
        from apps.notifications.models import Notification
        
        Notification.objects.create(
            user=task.intern,
            notification_type='INFO',
            title='Task Started',
            message=f'You started working on task: "{task.title}".',
        )
    except Exception as e:
        logger.error(f"Error sending task started notification: {str(e)}")
