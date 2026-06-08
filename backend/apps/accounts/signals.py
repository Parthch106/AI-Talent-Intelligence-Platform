from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, InternProfile

@receiver(post_save, sender=User)
def create_intern_profile(sender, instance, created, **kwargs):
    """
    Automatically creates an InternProfile when a new Intern user is registered.
    """
    if created and instance.role == User.Role.INTERN:
        InternProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_intern_profile(sender, instance, **kwargs):
    """
    Ensures the InternProfile is saved when the User object is updated.
    """
    if instance.role == User.Role.INTERN and hasattr(instance, 'internprofile'):
        instance.internprofile.save()
