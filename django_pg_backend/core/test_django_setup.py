#!/usr/bin/env python
"""Test with Django setup"""
import os
import sys

print("Before Django setup...", file=sys.stderr)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

print("After Django setup!", file=sys.stderr)

# Check what's in the env now
print(f"GITHUB_TOKEN: {os.environ.get('GITHUB_TOKEN', 'NOT SET')[:20]}...", file=sys.stderr)
print(f"OPENAI_API_KEY: {os.environ.get('OPENAI_API_KEY', 'NOT SET')}", file=sys.stderr)

# Set manually after Django setup
os.environ["GITHUB_TOKEN"] = "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"
os.environ["OPENAI_BASE_URL"] = "https://models.inference.ai.azure.com"

from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("GITHUB_TOKEN"),
    base_url=os.environ.get("OPENAI_BASE_URL")
)

result = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "hi"}],
    max_tokens=10
)
print(f"Result: {result.choices[0].message.content}", file=sys.stderr)
