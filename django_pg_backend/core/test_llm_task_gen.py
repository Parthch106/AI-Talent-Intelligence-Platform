"""Test script for Hugging Face task generator integration."""
import sys
import os

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

import json
import requests
from apps.analytics.services.llm_task_generator import (
    HF_API_URL, HF_MODEL, get_task_generator
)

# Test the task generator
print('=== Testing Task Generator ===')
generator = get_task_generator()
print('Generator initialized')

# Test with sample data
result = generator.generate_task_suggestions(
    intern_name='Test Intern',
    intern_skills=['Python', 'Machine Learning'],
    completed_tasks=[
        {'title': 'Data Analysis', 'description': 'Analyzed dataset', 'status': 'completed', 'quality_rating': 4}
    ],
    ongoing_tasks=[],
    module_name='Machine Learning',
    module_description='ML project for interns',
    task_context='Learn ML fundamentals',
    num_suggestions=2
)

print('\n=== Result ===')
print(json.dumps(result, indent=2))