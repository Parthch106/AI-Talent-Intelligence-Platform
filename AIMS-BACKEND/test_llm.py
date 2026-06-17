import os
import django
import sys

sys.path.append(r"e:\CSU Internship\AI_Talent_Intelligence_Platform_V_0.2.1.05.06.26\AIMS-BACKEND")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aims.settings')
django.setup()

from apps.analytics.services.llm_learning_path_generator import get_learning_path_generator
generator = get_learning_path_generator()
print(generator.generate_milestone_task('Python', 'John', 'Focus on basics', basics_only=True))
