"""Quick test script to verify GitHub token works"""
import os
import sys

# Setup Django path - settings.py is in core/core/
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'core'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

token = os.environ.get('GITHUB_TOKEN')
print(f'Token loaded: {token[:20]}...' if token else 'NO TOKEN')

# Test API
from openai import OpenAI
client = OpenAI(
    base_url='https://models.inference.ai.azure.com',
    api_key=token
)

try:
    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': 'Say OK'}],
        max_tokens=10
    )
    print(f'API WORKS! Response: {response.choices[0].message.content}')
except Exception as e:
    print(f'API FAILED: {e}')
