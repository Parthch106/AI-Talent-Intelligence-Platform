from django.core.management.base import BaseCommand
from apps.analytics.models import RoleRequirement


class Command(BaseCommand):
    help = 'Seed role requirements for resume analysis'

    def handle(self, *args, **kwargs):
        role_requirements_data = [
            {
                'role_name': 'FRONTEND_DEVELOPER',
                'required_core_skills': ['javascript', 'typescript', 'react', 'html', 'css'],
                'preferred_skills': ['vue', 'angular', 'next.js', 'redux', 'tailwind'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['frontend'],
                'required_tools': ['git', 'npm', 'webpack'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'BACKEND_DEVELOPER',
                'required_core_skills': ['python', 'django', 'sql', 'rest api'],
                'preferred_skills': ['flask', 'fastapi', 'postgresql', 'redis', 'docker'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['backend'],
                'required_tools': ['git', 'docker', 'nginx'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'FULLSTACK_DEVELOPER',
                'required_core_skills': ['javascript', 'python', 'react', 'django', 'sql'],
                'preferred_skills': ['typescript', 'node.js', 'postgresql', 'docker', 'kubernetes'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['frontend', 'backend'],
                'required_tools': ['git', 'docker', 'npm', 'pip'],
                'minimum_projects': 3,
                'required_certifications': [],
            },
            {
                'role_name': 'DATA_SCIENTIST',
                'required_core_skills': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'preferred_skills': ['tensorflow', 'pytorch', 'matplotlib', 'seaborn', 'sql'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['data_science'],
                'required_tools': ['jupyter', 'git'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'ML_ENGINEER',
                'required_core_skills': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'preferred_skills': ['keras', 'scikit-learn', 'pandas', 'numpy', 'docker'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['machine_learning'],
                'required_tools': ['git', 'docker', 'jupyter'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'DEVOPS_ENGINEER',
                'required_core_skills': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'preferred_skills': ['aws', 'terraform', 'ansible', 'jenkins', 'linux'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['devops'],
                'required_tools': ['docker', 'kubernetes', 'git', 'jenkins'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'MOBILE_DEVELOPER',
                'required_core_skills': ['react native', 'javascript', 'mobile'],
                'preferred_skills': ['flutter', 'ios', 'android', 'swift', 'kotlin'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': ['mobile'],
                'required_tools': ['git', 'xcode', 'android studio'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'QA_ENGINEER',
                'required_core_skills': ['testing', 'automation', 'python'],
                'preferred_skills': ['selenium', 'pytest', 'junit', 'cypress', 'postman'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': ['git', 'jira'],
                'minimum_projects': 2,
                'required_certifications': [],
            },
            {
                'role_name': 'UI_UX_DESIGNER',
                'required_core_skills': ['ui', 'ux', 'design', 'figma'],
                'preferred_skills': ['adobe xd', 'sketch', 'prototyping', 'user research'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': ['figma', 'adobe xd'],
                'minimum_projects': 3,
                'required_certifications': [],
            },
            {
                'role_name': 'PRODUCT_MANAGER',
                'required_core_skills': ['product management', 'agile', 'scrum'],
                'preferred_skills': ['jira', 'confluence', 'user stories', 'roadmap', 'analytics'],
                'minimum_qualification': 'Bachelor',
                'minimum_experience_years': 0.0,
                'required_domains': [],
                'required_tools': ['jira', 'confluence'],
                'minimum_projects': 1,
                'required_certifications': [],
            },
        ]

        created_count = 0
        updated_count = 0

        for role_data in role_requirements_data:
            role_name = role_data['role_name']
            role, created = RoleRequirement.objects.update_or_create(
                role_name=role_name,
                defaults=role_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created role requirement: {role.get_role_name_display()}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated role requirement: {role.get_role_name_display()}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: {created_count} created, {updated_count} updated'
            )
        )
