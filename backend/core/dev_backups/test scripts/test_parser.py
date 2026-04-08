import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.services.weekly_report_parser import parse_weekly_report, extract_text_from_pdf

def test():
    pdf_path = 'Parth_Chauhan_Weekly_Report.pdf'
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found")
        return

    with open(pdf_path, 'rb') as f:
        full_text = extract_text_from_pdf(f)
        print("--- RAW TEXT START (1000 chars) ---")
        print(full_text[:1000])
        print("--- END SAMPLE ---")
        
        # Reset file for parse call
        f.seek(0)
        result = parse_weekly_report(f)
        
    print("--- PARSER RESULTS ---")
    print(f"Intern Name:    {result.get('intern_name')}")
    print(f"Date:           {result.get('date')}")
    print(f"Project Title:  {result.get('project_title')}")
    print(f"--- Completed Raw ---")
    print(result.get('tasks_completed'))
    print(f"----------------------")
    print(f"--- In Progress Raw ---")
    print(result.get('tasks_in_progress'))
    print(f"----------------------")
    print(f"--- Blocked Raw ---")
    print(result.get('tasks_blocked'))
    print(f"----------------------")
    print(f"Self Rating:     {result.get('self_rating')}")
    print("----------------------")
    
    # Verify task counts as the view would
    import re
    def count_tasks(text):
        if not text: return 0
        # Count numbered tasks (1., 2, 1), etc.) or bulleted tasks (-, *)
        # Strictly anchored to line starts to avoid over-counting
        matches = re.findall(r'^(?:\d+[\.\)]?|[\-\*])\s+\w+', text, re.MULTILINE)
        return max(len(matches), 1 if len(text.strip()) > 15 else 0)
    
    comp_count = count_tasks(result.get('tasks_completed'))
    prog_count = count_tasks(result.get('tasks_in_progress'))
    block_count = count_tasks(result.get('tasks_blocked'))
    
    print(f"Counted Completed: {comp_count}")
    print(f"Counted In-Progress: {prog_count}")
    print(f"Counted Blocked: {block_count}")

if __name__ == "__main__":
    test()
