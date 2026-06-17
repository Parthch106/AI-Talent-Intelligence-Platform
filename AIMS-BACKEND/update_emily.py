import os
import django
from django.utils import timezone
from datetime import timedelta
import random

def update_data():
    from apps.accounts.models import User
    from apps.analytics.models import SkillProfile

    user = User.objects.filter(full_name__icontains='Emily Davis', role='INTERN').first()
    if not user:
        return

    # Update to 150 days (150/180 = 83%)
    user.date_joined = timezone.now() - timedelta(days=150)
    user.save()

    # Add 8 more skills (18/20 = 90%)
    more_skills = ['AWS', 'CI/CD', 'GraphQL', 'Kubernetes', 'Redis', 'PostgreSQL', 'Agile', 'Jira']
    skill_objs = [
        SkillProfile(
            intern_id=user.id,
            skill_name=skill,
            mastery_level=random.uniform(70, 95)
        )
        for skill in more_skills
    ]
    SkillProfile.objects.bulk_create(skill_objs)

    print("✅ Updated Emily Davis with more skills and days!")

if __name__ == '__main__':
    update_data()
