#!/usr/bin/env python
"""Test full parser"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

import sys
print("Starting test...", file=sys.stderr)

from apps.analytics.services.llm_resume_parser import LangChainResumeParser

parser = LangChainResumeParser()

resume_text = """John Doe
Email: john@example.com
Skills: Python, Django, React
Experience: Software Engineer at Tech Corp (2020-2024)
Education: BS Computer Science at State University"""

print(f"Parsing resume: {len(resume_text)} chars", file=sys.stderr)
result = parser.parse(resume_text)

print('SUCCESS!', file=sys.stderr)
print(f'Result keys: {list(result.keys())}', file=sys.stderr)
print(f'Full name: {result.get("full_name")}', file=sys.stderr)
print(f'Technical skills: {result.get("technical_skills", [])}', file=sys.stderr)
