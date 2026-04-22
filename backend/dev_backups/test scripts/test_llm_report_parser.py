import os
import django
import sys
import json

# Setup Django
# The script is in the root directory, so we add current path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend/core')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.services.llm_weekly_report_parser import llm_weekly_report_parser

test_text = """
WEEKLY REPORT
Intern Name: Parth Chauhan
Project Title: AI Talent Intelligence Platform
Date: 06/04/2026

I. Completed Tasks
1. Implemented code splitting for the frontend.
2. Optimized build size by 90%.
3. Added manual chunking.

II. Tasks In Progress
1. LLM parsing for weekly reports.

III. Challenges
Regex parsing was fragile and failed on complex layouts.

IV. Learnings
Vite build optimization and manual chunking are powerful tools.

V. Next Week Goals
1. Complete LLM integration.
2. Add more analytics dashboards.
"""

try:
    print("="*60)
    print("VERIFYING LLM WEEKLY REPORT PARSER")
    print("="*60)
    print("Input Text Preview:")
    print(test_text[:200] + "...")
    print("-" * 60)
    
    result = llm_weekly_report_parser.parse(test_text)
    
    print("\nParsed Result:")
    print(json.dumps(result, indent=2))
    
    # Validation checks
    assert result['intern_name'] == 'Parth Chauhan'
    assert result['tasks_completed_count'] == 3
    assert result['tasks_in_progress_count'] == 1
    assert 'self_rating' not in result
    
    print("\n" + "="*60)
    print("VERIFICATION SUCCESSFUL")
    print("="*60)
except Exception as e:
    print(f"\nVERIFICATION FAILED: {e}")
    import traceback
    traceback.print_exc()
