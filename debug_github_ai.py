import os
import requests
import json
from dotenv import load_dotenv

# Try to find .env in multiple locations
env_paths = [
    'e:/CSU Internship/AI-Talent-Intelligence-Platform/AI-Talent-Intelligence-Platform/backend/core/.env',
    'e:/CSU Internship/AI-Talent-Intelligence-Platform/AI-Talent-Intelligence-Platform/.env',
]

GITHUB_TOKEN = None
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        GITHUB_TOKEN = os.getenv('AI_TALENT_GITHUB_TOKEN')
        if GITHUB_TOKEN:
            print(f"Loaded token from {env_path}")
            break

if not GITHUB_TOKEN:
    GITHUB_TOKEN = os.getenv('AI_TALENT_GITHUB_TOKEN')
    if GITHUB_TOKEN:
        print("Token found in system environment")

GITHUB_API_URL = "https://models.inference.ai.azure.com/chat/completions"
GITHUB_MODEL = "gpt-4o-mini"

print(f"Token present: {bool(GITHUB_TOKEN)}")
if GITHUB_TOKEN:
    print(f"Token preview: {GITHUB_TOKEN[:4]}...{GITHUB_TOKEN[-4:]}")

headers = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "model": GITHUB_MODEL,
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello"}
    ],
}

try:
    print(f"Connecting to {GITHUB_API_URL}...")
    response = requests.post(GITHUB_API_URL, headers=headers, json=payload, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
