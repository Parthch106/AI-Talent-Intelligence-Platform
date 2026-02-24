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
                # Check if all tasks for the project are completed
                _check_project_completion(instance)
            elif instance.status == 'IN_PROGRESS':
                _notify_task_started(instance)
        except Exception as e:
            logger.error(f"Error in task status notification: {str(e)}")


def _check_project_completion(task):
    """
    Check if all tasks for a project are completed and auto-mark project as PENDING_APPROVAL.
    """
    try:
        if not task.project_assignment:
            return
        
        project_assignment = task.project_assignment
        
        # Skip if project is already in a final state
        if project_assignment.status in ['COMPLETED', 'DROPPED', 'PENDING_APPROVAL']:
            return
        
        # Get all tasks for this project assignment
        all_tasks = project_assignment.tasks.all()
        total_tasks = all_tasks.count()
        
        if total_tasks == 0:
            return
        
        # Check if all tasks are completed
        completed_tasks = all_tasks.filter(status='COMPLETED').count()
        
        if completed_tasks == total_tasks and total_tasks > 0:
            # All tasks completed - auto-mark project as PENDING_APPROVAL
            old_status = project_assignment.status
            project_assignment.status = 'PENDING_APPROVAL'
            project_assignment.save()
            
            logger.info(f"Project {project_assignment.project.name} auto-marked as PENDING_APPROVAL - all {total_tasks} tasks completed")
            
            # Send notification to managers for approval
            _notify_project_pending_approval(project_assignment)
    except Exception as e:
        logger.error(f"Error checking project completion: {str(e)}")


def _notify_project_pending_approval(project_assignment):
    """Send notification to managers when a project is pending approval."""
    try:
        from apps.notifications.models import Notification
        from apps.accounts.models import User
        
        intern = project_assignment.intern
        project_name = project_assignment.project.name
        
        # Notify all managers
        managers = User.objects.filter(role__in=[User.Role.MANAGER, User.Role.ADMIN])
        for manager in managers:
            Notification.objects.create(
                user=manager,
                notification_type='PROJECT_PENDING_APPROVAL',
                title='Project Pending Approval',
                message=f'{intern.full_name}\'s project "{project_name}" is awaiting approval. All tasks have been completed.',
            )
    except Exception as e:
        logger.error(f"Error sending project pending approval notification: {str(e)}")


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
