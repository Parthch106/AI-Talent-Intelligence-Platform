"""
Signals for automatic notification creation.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def create_notification(user, notification_type, title, message):
    """
    Helper function to create a notification.
    """
    try:
        from apps.notifications.models import Notification
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
        )
        logger.info(f"Created notification: {title} for user {user.email}")
        return notification
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        return None


def notify_intern_assignment(intern, project, mentor):
    """Create notification when an intern is assigned to a project."""
    create_notification(
        user=intern,
        notification_type='INTERN_ASSIGNED',
        title='New Project Assignment',
        message=f'You have been assigned to project "{project.title}" by {mentor.full_name}.',
    )


def notify_task_completed(intern, task, completed_by=None):
    """Create notification when a task is completed."""
    completed_by_name = completed_by.full_name if completed_by else 'You'
    create_notification(
        user=intern,
        notification_type='TASK_COMPLETED',
        title='Task Completed',
        message=f'{completed_by_name} completed task: "{task.title}".',
    )


def notify_task_assigned(intern, task, assigned_by):
    """Create notification when a task is assigned to an intern."""
    create_notification(
        user=intern,
        notification_type='TASK_ASSIGNED',
        title='New Task Assigned',
        message=f'You have been assigned a new task: "{task.title}" by {assigned_by.full_name}.',
    )


def notify_task_submitted(task, intern):
    """Notify managers when an intern submits a task."""
    from apps.accounts.models import User
    
    # Notify managers in the same department
    managers = User.objects.filter(role=User.Role.MANAGER, department=intern.department)
    for manager in managers:
        create_notification(
            user=manager,
            notification_type='TASK_SUBMITTED',
            title='Task Submitted',
            message=f'{intern.full_name} has submitted task: "{task.title}" for review.',
        )


def notify_task_evaluated(task, intern, manager, status_type):
    """Notify intern when their task is evaluated (approved/rework)."""
    verb = 'approved' if status_type == 'COMPLETED' else 'marked for rework'
    create_notification(
        user=intern,
        notification_type='TASK_EVALUATED',
        title=f'Task {verb.capitalize()}',
        message=f'Your task "{task.title}" has been {verb} by {manager.full_name}.',
    )


def notify_report_uploaded(report, intern):
    """Notify managers when a weekly report is uploaded."""
    from apps.accounts.models import User
    
    managers = User.objects.filter(role=User.Role.MANAGER, department=intern.department)
    for manager in managers:
        create_notification(
            user=manager,
            notification_type='REPORT_UPLOADED',
            title='Weekly Report Uploaded',
            message=f'{intern.full_name} has uploaded a new weekly report for {report.week_start_date}.',
        )

# Signal receivers
@receiver(post_save, sender='analytics.TaskTracking')
def task_tracking_notification_trigger(sender, instance, created, **kwargs):
    """Trigger notifications based on TaskTracking changes."""
    # We will trigger these from the VIEW directly for better control over context (manager vs intern)
    # to avoid complex logic here. However, WeeklyReport is simple.
    pass


@receiver(post_save, sender='analytics.WeeklyReport')
def weekly_report_notification_trigger(sender, instance, created, **kwargs):
    """Trigger notification when a weekly report is uploaded."""
    if created:
        notify_report_uploaded(instance, instance.intern)


def notify_intelligence_computed(intern, score=None):
    """Create notification when intern intelligence is computed."""
    message = 'Your intelligence analysis has been completed.'
    if score is not None:
        message = f'Your intelligence analysis is ready. Overall suitability score: {score:.1f}%.'
    
    create_notification(
        user=intern,
        notification_type='SYSTEM',
        title='Intelligence Analysis Complete',
        message=message,
    )


def notify_manager_new_intern(intern, department):
    """Notify managers when a new intern joins their department."""
    from apps.accounts.models import User
    
    managers = User.objects.filter(role=User.Role.MANAGER, department=department)
    for manager in managers:
        create_notification(
            user=manager,
            notification_type='INTERN_ASSIGNED',
            title='New Intern Joined',
            message=f'{intern.full_name} has joined your department.',
        )


def notify_feedback_received(intern, feedback_type, from_user):
    """Create notification when feedback is received."""
    create_notification(
        user=intern,
        notification_type='FEEDBACK_RECEIVED',
        title='New Feedback Received',
        message=f'You received new {feedback_type} feedback from {from_user.full_name}.',
    )
