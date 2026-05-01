
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, InternProfile

interns = User.objects.filter(role='INTERN')
print(f"Total Interns: {interns.count()}")
for intern in interns:
    profile = getattr(intern, 'internprofile', None)
    status = profile.status if profile else 'No Profile'
    print(f"- {intern.email}: {status} (Dept: {intern.department})")
