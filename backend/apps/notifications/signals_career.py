
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender='analytics.CertificationRecord')
def notify_certificate_generated(sender, instance, created, **kwargs):
    if created:
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=instance.intern,
            notification_type='CERTIFICATE_GENERATED',
            title='New Certificate Issued! 🎓',
            message=f"Congratulations! Your certificate for {instance.get_cert_type_display()} has been generated.",
            link=f"/career/phase-timeline"
        )

@receiver(post_save, sender='analytics.EmploymentStage')
def notify_promotion(sender, instance, created, **kwargs):
    if created:
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=instance.intern,
            notification_type='PROMOTION_SUCCESS',
            title='Phase Transition! 🚀',
            message=f"You have been successfully transitioned to {instance.get_phase_display()}.",
            link=f"/career/phase-timeline"
        )

@receiver(post_save, sender='accounts.FullTimeOffer')
def notify_ppo_issued(sender, instance, created, **kwargs):
    if created:
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=instance.intern,
            notification_type='OFFER_ISSUED',
            title='PPO Issued! 🎉',
            message=f"A Pre-Placement Offer has been issued for the role of {instance.recommended_role_title}.",
            link=f"/career/offers"
        )
