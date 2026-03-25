"""Test script for Hugging Face model integration - standalone version."""
import requests

API_URL = "https://router.huggingface.co/v1/chat/completions"

HEADERS = {
    "Authorization": "Bearer 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",
    "Content-Type": "application/json"
}

# Using a model that's commonly available on HF Spaces
payload = {
    "model": "meta-llama/Llama-3.2-1B-Instruct",
    "messages": [
        {"role": "user", "content": "Suggest 5 tasks for a machine learning intern."}
    ],
    "max_tokens": 150,
    "temperature": 0.7
}

print("Testing HF Router with Llama 3.2...\n")

response = requests.post(API_URL, headers=HEADERS, json=payload)

print("Status Code:", response.status_code)
print("Response:\n", response.text)