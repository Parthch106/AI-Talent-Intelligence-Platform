#!/usr/bin/env python
"""Simple test from within django core directory"""
import os
import sys

print("Starting test...", file=sys.stderr)

# Set env vars manually
os.environ["GITHUB_TOKEN"] = "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"
os.environ["OPENAI_BASE_URL"] = "https://models.inference.ai.azure.com"

print(f"Token: {os.environ.get('GITHUB_TOKEN', 'NOT SET')[:20]}...", file=sys.stderr)

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
