"""
Management command to seed job roles for the Talent Intelligence System.
"""
from django.core.management.base import BaseCommand
from apps.analytics.models import JobRole


class Command(BaseCommand):
    help = 'Seed default job roles for the Talent Intelligence System'

    def handle(self, *args, **kwargs):
        job_roles = [
            {
                'role_title': 'FRONTEND_DEVELOPER',
                'role_description': 'Frontend developer specializing in React, JavaScript, and modern web technologies',
                'mandatory_skills': ['javascript', 'typescript', 'react', 'html', 'css'],
                'preferred_skills': ['vue', 'angular', 'next.js', 'redux', 'tailwind', 'graphql']
            },
            {
                'role_title': 'BACKEND_DEVELOPER',
                'role_description': 'Backend developer with expertise in Python, Django, and database systems',
                'mandatory_skills': ['python', 'django', 'sql', 'rest api'],
                'preferred_skills': ['flask', 'fastapi', 'postgresql', 'redis', 'docker', 'graphql']
            },
            {
                'role_title': 'FULLSTACK_DEVELOPER',
                'role_description': 'Full-stack developer proficient in both frontend and backend technologies',
                'mandatory_skills': ['javascript', 'python', 'react', 'django', 'sql'],
                'preferred_skills': ['typescript', 'node.js', 'postgresql', 'docker', 'graphql', 'aws']
            },
            {
                'role_title': 'DATA_SCIENTIST',
                'role_description': 'Data scientist with skills in machine learning, data analysis, and visualization',
                'mandatory_skills': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'preferred_skills': ['tensorflow', 'pytorch', 'matplotlib', 'sql', 'tableau', 'jupyter']
            },
            {
                'role_title': 'ML_ENGINEER',
                'role_description': 'Machine learning engineer focused on model development and deployment',
                'mandatory_skills': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'preferred_skills': ['keras', 'scikit-learn', 'docker', 'aws', 'kubernetes', 'mlops']
            },
            {
                'role_title': 'DEVOPS_ENGINEER',
                'role_description': 'DevOps engineer specializing in cloud infrastructure and CI/CD',
                'mandatory_skills': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'preferred_skills': ['aws', 'terraform', 'ansible', 'jenkins', 'linux', 'gcp']
            },
            {
                'role_title': 'SOFTWARE_ENGINEER',
                'role_description': 'Software engineer with strong programming fundamentals',
                'mandatory_skills': ['python', 'java', 'javascript', 'git'],
                'preferred_skills': ['sql', 'docker', 'rest api', 'data structures', 'algorithms']
            },
            {
                'role_title': 'MOBILE_DEVELOPER',
                'role_description': 'Mobile developer for iOS and Android platforms',
                'mandatory_skills': ['react native', 'javascript', 'mobile development'],
                'preferred_skills': ['flutter', 'ios', 'android', 'swift', 'kotlin', 'firebase']
            },
        ]

        created = 0
        updated = 0

        for role_data in job_roles:
            role, is_new = JobRole.objects.update_or_create(
                role_title=role_data['role_title'],
                defaults=role_data
            )
            
            if is_new:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created job role: {role.role_title}')
                )
            else:
                updated += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated job role: {role.role_title}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSummary: {created} created, {updated} updated')
        )
