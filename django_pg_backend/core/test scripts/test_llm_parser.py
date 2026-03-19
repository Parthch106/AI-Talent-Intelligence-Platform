#!/usr/bin/env python
"""Test script to verify LLM parser works in Django"""
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'core'))

import django
django.setup()

print("=== TESTING LLM PARSER ===")

try:
    from apps.analytics.services.llm_resume_parser import LangChainResumeParser
    print("Imported LangChainResumeParser OK")
    
    parser = LangChainResumeParser()
    print(f"Parser initialized: {type(parser).__name__}")
    
    # IMPORTANT: Use .llm property to trigger lazy initialization!
    print("Accessing parser.llm property to initialize LLM...")
    llm = parser.llm
    print(f"LLM object: {llm}")
    
    # Test the LLM
    print("Testing LLM with simple prompt...")
    response = llm.invoke("Say 'Hello World'")
    print(f"LLM Response: {response.content}")
    
    print("=== SUCCESS ===")
except Exception as e:
    print(f"=== ERROR: {e} ===")
    import traceback
    traceback.print_exc()
