from apps.accounts.models import User, InternProfile, StipendRecord
from datetime import date, timedelta
import random

# Get all interns
interns = User.objects.filter(role='INTERN')

print(f"Syncing {interns.count()} interns to V2 InternProfile...")

for intern in interns:
    profile, created = InternProfile.objects.get_or_create(user=intern)
    
    # Assign random join dates if missing
    if not profile.join_date:
        days_ago = random.choice([30, 60, 90, 180, 210, 240, 365])
        profile.join_date = date.today() - timedelta(days=days_ago)
        
        # Set status based on months active
        months_active = days_ago // 30
        if months_active >= 12:
            profile.status = 'PHASE_2_COMPLETE'
        elif months_active >= 6:
            profile.status = 'STIPEND_INTERN'
        else:
            profile.status = 'ACTIVE_INTERN'
            
        profile.save()
        print(f" - Created/Updated profile for {intern.email}: {profile.status} (Joined {profile.join_date})")

    # Create some stipend records for PHASE 2 interns
    if profile.status in ['STIPEND_INTERN', 'PHASE_2_COMPLETE']:
        # Create records for the last 2 months if they don't exist
        for i in range(1, 3):
            month_date = date.today().replace(day=1) - timedelta(days=i*30)
            month_date = month_date.replace(day=1)
            
            stipend, s_created = StipendRecord.objects.get_or_create(
                intern=intern,
                month=month_date,
                defaults={
                    'amount': 15000.00,
                    'status': 'APPROVED' if i > 1 else 'PENDING',
                    'notes': f'Stipend for {month_date.strftime("%B %Y")}'
                }
            )
            if s_created:
                print(f"   + Created stipend for {intern.email} for {month_date.strftime('%B %Y')}")

print("V2 data sync complete.")
