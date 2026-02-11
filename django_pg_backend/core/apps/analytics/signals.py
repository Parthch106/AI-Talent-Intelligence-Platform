"""
Signals for automatic intelligence computation.
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
            else:
                logger.warning(
                    f"Failed to compute intelligence for {instance.user.email} "
                    f"after resume data {'creation' if created else 'update'}"
                )
    except Exception as e:
        logger.error(
            f"Error computing intelligence for {instance.user.email}: {str(e)}"
        )
