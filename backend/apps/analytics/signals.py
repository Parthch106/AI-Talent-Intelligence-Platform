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
        from apps.analytics.models import Application, ModelPrediction
        
        # Get the latest intelligence score if available
        application = Application.objects.filter(intern=user).first()
        score = None
        if application:
            prediction = ModelPrediction.objects.filter(application=application).first()
            if prediction and prediction.suitability_score is not None:
                score = prediction.suitability_score * 100
        
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
    from apps.analytics.models import TaskTracking, PhaseEvaluation
    
    @receiver(post_save, sender=PhaseEvaluation)
    def on_phase_evaluation_saved(sender, instance, created, **kwargs):
        """
        Fires every time a PhaseEvaluation is saved.
        Triggers the criteria evaluation + certificate generation Celery pipeline
        ONLY when:
          1. The decision is 'PROMOTE' (manager explicitly promoting)
          2. The criteria evaluation hasn't already run for this evaluation
        """
        if instance.decision == 'PROMOTE':
            # Avoid re-triggering if a certificate already exists
            if not hasattr(instance, 'certificate'):
                from .tasks import run_criteria_evaluation
                run_criteria_evaluation.delay(instance.pk)

    @receiver(post_save, sender=TaskTracking)
    def task_status_changed(sender, instance, created, **kwargs):
        """
        Create notifications when task status changes.
        Also calculates skill mastery for project tasks.
        """
        try:
            # Skip if it's a new task (created) - we only notify on status changes
            if created:
                return
            
            if instance.status == 'COMPLETED':
                _notify_task_completed(instance)
                # Check if all tasks for the project are completed
                _check_project_completion(instance)
                # Calculate skill mastery for project tasks
                _calculate_skill_mastery(instance)
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


def _calculate_skill_mastery(task):
    """
    Calculate and update skill mastery for project tasks.
    Only updates skills that are NOT already in the intern's SkillProfile.
    
    Mastery calculation:
    - Base value: 0.1 (10% mastery per completed task)
    - Quality bonus: If quality_rating exists, add up to 0.05 based on rating (0-5 scale)
    - Code review bonus: If code_review_score exists, add up to 0.05 based on score (0-100)
    
    Formula: mastery = 0.1 + (quality_rating / 100) * 0.05 + (code_review_score / 100) * 0.05
    Maximum initial mastery: 0.2 (20%)
    """
    try:
        # Only process project tasks (tasks with project_assignment)
        if not task.project_assignment:
            logger.debug(f"Task {task.task_id} is not a project task, skipping mastery calculation")
            return
        
        # Check if task has skills defined
        skills = task.skills_required
        if not skills or not isinstance(skills, list) or len(skills) == 0:
            logger.debug(f"Task {task.task_id} has no skills_required, skipping mastery calculation")
            return
        
        from apps.analytics.models import SkillProfile
        
        # Calculate base mastery based on task completion
        base_mastery = 0.1  # 10% base mastery per completed task
        
        # Add quality bonus if available (0-5 rating -> 0-0.05 bonus)
        quality_bonus = 0.0
        if task.quality_rating is not None:
            quality_bonus = (task.quality_rating / 5.0) * 0.05
        
        # Add code review bonus if available (0-100 score -> 0-0.05 bonus)
        code_review_bonus = 0.0
        if task.code_review_score is not None:
            code_review_bonus = (task.code_review_score / 100.0) * 0.05
        
        # Calculate total mastery (cap at 0.2 for new skills)
        mastery_level = min(0.2, base_mastery + quality_bonus + code_review_bonus)
        
        # Update or create SkillProfile for each skill
        skills_updated = []
        for skill_name in skills:
            if not skill_name or not isinstance(skill_name, str):
                continue
            
            # Normalize skill name (strip whitespace, capitalize first letter)
            skill_name = skill_name.strip().title()
            if not skill_name:
                continue
            
            # Check if skill already exists in SkillProfile
            existing_profile = SkillProfile.objects.filter(
                intern=task.intern,
                skill_name=skill_name
            ).first()
            
            if existing_profile:
                logger.debug(f"Skill '{skill_name}' already exists for {task.intern.email}, skipping")
                continue
            
            # Create new SkillProfile entry
            SkillProfile.objects.create(
                intern=task.intern,
                skill_name=skill_name,
                mastery_level=mastery_level,
                learning_rate=0.1  # Default learning rate
            )
            skills_updated.append(skill_name)
            logger.info(f"Created SkillProfile for {task.intern.email}: {skill_name} = {mastery_level:.2f}")
        
        if skills_updated:
            logger.info(f"Skill mastery calculated for {task.intern.email}: {', '.join(skills_updated)}")
        
    except Exception as e:
        logger.error(f"Error calculating skill mastery for task {task.task_id}: {str(e)}")
