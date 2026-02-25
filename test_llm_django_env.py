#!/usr/bin/env python
"""Test LLM with Django-style environment loading"""
import os

# Simulate what Django does - load .env from django_pg_backend/core/core/.env
from pathlib import Path
env_path = Path('django_pg_backend/core/core/.env')
print(f"Loading .env from: {env_path.exists()}")

# Read and set env vars like Django would
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ[key] = value
            print(f"Set {key} = {value[:20]}...")

print(f"\nGITHUB_TOKEN from env: {os.environ.get('GITHUB_TOKEN', 'NOT SET')[:20]}...")
print(f"OPENAI_API_KEY from env: {os.environ.get('OPENAI_API_KEY', 'NOT SET')}")

# Now try using OpenAI
from openai import OpenAI

api_key = os.environ.get("GITHUB_TOKEN")
base_url = "https://models.inference.ai.azure.com"

print(f"\n=== Creating client with api_key={api_key[:20]}... and base_url={base_url} ===")

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

print("Invoking...")
result = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "hi"}],
    max_tokens=10
)
print(f"Result: {result.choices[0].message.content}")
