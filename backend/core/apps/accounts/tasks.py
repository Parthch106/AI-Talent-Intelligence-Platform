from celery import shared_task
import logging
from datetime import date
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


@shared_task(name='apps.accounts.tasks.expire_pending_offers')
def expire_pending_offers():
    """
    Runs daily at 1:00 AM.
    Sets FullTimeOffer.status = 'EXPIRED' for all ISSUED offers
    where response_deadline has passed and the intern has not responded.
    """
    from apps.accounts.models import FullTimeOffer, InternProfile

    today   = date.today()
    expired = FullTimeOffer.objects.filter(
        status='ISSUED',
        response_deadline__lt=today,
        intern_response_at__isnull=True,
    )

    count = 0
    for offer in expired:
        offer.status = 'EXPIRED'
        offer.save(update_fields=['status', 'updated_at'])

        # Update intern profile to NOT_CONVERTED
        InternProfile.objects.filter(user=offer.intern).update(status='NOT_CONVERTED')

        # Notify admin
        _notify_offer_expired(offer)
        count += 1

    logger.info(f"expire_pending_offers: expired {count} offer(s).")
    return {'expired': count}


def _notify_offer_expired(offer):
    try:
        from apps.notifications.models import Notification
        User = get_user_model()
        for admin in User.objects.filter(role='ADMIN'):
            Notification.objects.create(
                recipient  = admin,
                message    = (
                    f"PPO offer for {offer.intern.get_full_name()} has expired. "
                    f"Deadline was {offer.response_deadline}. Intern marked as NOT_CONVERTED."
                ),
                notif_type = 'OFFER_EXPIRED',
                is_urgent  = False,
            )
    except Exception:
        pass
