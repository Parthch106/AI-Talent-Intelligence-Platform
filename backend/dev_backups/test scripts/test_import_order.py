#!/usr/bin/env python
"""Test import order with Django"""
import os
import sys

print("Step 1: Before Django setup", file=sys.stderr)
print(f"  GITHUB_TOKEN = {os.environ.get('GITHUB_TOKEN', 'NOT SET')}", file=sys.stderr)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

print("Step 2: Calling django.setup()...", file=sys.stderr)
import django
django.setup()

print("Step 3: After Django setup", file=sys.stderr)
print(f"  GITHUB_TOKEN = {os.environ.get('GITHUB_TOKEN', 'NOT SET')[:20]}...", file=sys.stderr)

# Now import the app module
print("Step 4: Importing apps.analytics.services.llm_resume_parser...", file=sys.stderr)
from apps.analytics.services.llm_resume_parser import LangChainResumeParser

print("Step 5: After import", file=sys.stderr)
print(f"  GITHUB_TOKEN = {os.environ.get('GITHUB_TOKEN', 'NOT SET')[:20]}...", file=sys.stderr)

# Now create parser
parser = LangChainResumeParser()
print("Step 6: Parser created", file=sys.stderr)

# Access .llm to trigger initialization
print("Step 7: Accessing parser.llm...", file=sys.stderr)
llm = parser.llm
print(f"Step 8: LLM = {llm}", file=sys.stderr)

# Try to use it
print("Step 9: Trying to invoke LLM...", file=sys.stderr)
try:
    result = llm.invoke("hi")
    print(f"Result: {result.content}", file=sys.stderr)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
