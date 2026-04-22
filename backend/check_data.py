from apps.accounts.models import User, InternProfile
from django.db.models import Count
import json

print(f"Total Users: {User.objects.count()}")
print(f"Interns: {User.objects.filter(role='INTERN').count()}")
print(f"InternProfiles: {InternProfile.objects.count()}")

status_counts = list(InternProfile.objects.values('status').annotate(count=Count('status')))
print("Status counts:")
print(json.dumps(status_counts, indent=2))

# Check for missing profiles
interns_without_profile = User.objects.filter(role='INTERN').exclude(internprofile__isnull=False)
print(f"Interns without profile: {interns_without_profile.count()}")
for intern in interns_without_profile[:5]:
    print(f" - {intern.email}")

# Check for missing join_dates
missing_dates = InternProfile.objects.filter(join_date__isnull=True).count()
print(f"Profiles missing join_date: {missing_dates}")
