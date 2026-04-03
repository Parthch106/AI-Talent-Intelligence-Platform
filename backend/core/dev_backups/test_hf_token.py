import os
import requests
from dotenv import load_dotenv

load_dotenv(r'e:\CSU Internship\AI-Talent-Intelligence-Platform\AI-Talent-Intelligence-Platform\django_pg_backend\core\core\.env')

HF_TOKEN = os.environ.get("HF_TOKEN")
HF_API_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "meta-llama/Llama-3.2-1B-Instruct"

print(f"Testing HF_TOKEN: {HF_TOKEN[:5]}...{HF_TOKEN[-5:] if HF_TOKEN else 'None'}")

headers = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "model": HF_MODEL,
    "messages": [
        {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 10,
    "temperature": 0.3
}

print(f"Calling: {HF_API_URL}")
response = requests.post(HF_API_URL, headers=headers, json=payload)

if response.status_code == 200:
    print("Router API Call: SUCCESS")
    print(f"Response: {response.json().get('choices')[0]['message']['content']}")
else:
    print(f"Router API Call: FAILED. Status: {response.status_code}")
    print(f"Error: {response.text}")

