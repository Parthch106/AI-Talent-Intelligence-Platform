import re
from datetime import datetime

class WeeklyReportParser:
    # Standard delimiters for sections (Roman Numerals and labels)
    DELIM = r'(?=(?:I\.|II\.|III\.|IV\.|V\.|VI\.|VII\.|Problems?\s*Faced|Tasks?\s*In\s*Progress|InProgress|Ongoing|Ongoing\s*Development|Challenges?|Blocked|Impediments|Blockers|Solutions?\s*Found|Learnings?|Next\s*day|Plans?\s*for\s*Tomorrow|Tomorrow|Rating|SELF\s*EVALUATION|Next\s*Week\s*Goals|FOR\s*NEXT\s*PERIOD)[:\s\*\-\)]*(?:\n|$))'

    # Section patterns
    SECTIONS = {
        'tasks_completed': [
            r'COMPLETED\s*TASKS[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
            r'(?:I\.\s*)?(?:Tasks?\s*Completed|Completed\s*Tasks?|Accomplishments?|ACCOMPLISHMENTS)[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
        ],
        'tasks_in_progress': [
            r'(?:II\.\s*)?(?:Tasks?\s*(?:In\s*Progress|InProgress|Ongoing)|InProgress|Tasks?\s*Started|Ongoing\s*(?:Development|Tasks?))[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
        ],
        'tasks_blocked': [
            r'(?:III\.\s*)?(?:Tasks?\s*Blocked|Blocked|Blocked\s*Tasks?|Impediments|Blockers|IMPEDIMENTS)[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
        ],
        'challenges': [
            r'(?:IV\.\s*)?(?:Problems?\s*Faced|Challenges?|Difficulties?|Issues?|CHALLENGES)[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
            r'V\.\s*KEY\s*Challenges\s*ENCOUNTERED[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
        ],
        'learnings': [
            r'(?:V\.\s*)?(?:Solutions?\s*Found|Learnings?|What\s+(?:I|we)\s+learned|KEY\s*LEARNINGS)[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
            r'V\.\s*KEY\s*Learnings[:\s\*\-\)]*(.*?)(?=' + DELIM + ')',
        ],
        'next_week_goals': [
            r'(?:VI\.\s*)?(?:Plans?\s*(?:for\s*)?Tomorrow|Tomorrow[\']?s\s*Plans?|Upcoming\s*Tasks?|Next\s*Week|Goals?\s*for\s*Next\s*Week|STRATEGIC\s*GOALS)[:\s\*\-\)]*(.*?)(?=\n\n|VII\.|Rating|SELF\s*EVALUATION|\Z)',
            r'V\.\s*KEY\s*Next\s*Week\s*Goals\s*FOR\s*NEXT\s*PERIOD[:\s\*\-\)]*(.*?)(?=\n\n|VII\.|Rating|SELF\s*EVALUATION|\Z)',
        ],
    }
    
    def parse(self, text: str):
        text = self._clean_text(text)
        result = {
            'tasks_completed': self._extract_tasks_completed(text),
            'tasks_in_progress': self._extract_section(text, 'tasks_in_progress'),
            'tasks_blocked': self._extract_section(text, 'tasks_blocked'),
            'challenges': self._extract_section(text, 'challenges'),
            'learnings': self._extract_section(text, 'learnings'),
            'next_week_goals': self._extract_section(text, 'next_week_goals'),
        }
        return result
    
    def _clean_text(self, text: str) -> str:
        text = re.sub(r'AI TALENT INTELLIGENCE PLATFORM.*?PRIVATE & CONFIDENTIAL', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Weekly Internship Performance Report.*?Page \d+ of \d+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def _extract_tasks_completed(self, text: str) -> str:
        tasks = []
        for pattern in self.SECTIONS.get('tasks_completed', []):
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                section_text = match.group(1).strip()
                # Extract numbered tasks
                # captures sequence: number + punctuation? + space + description
                task_items = re.findall(r'(\d+)[\.\)]?[\s\t]+(.+?)(?=\s+\d+[\.\)]?[\s\t]+|$)', section_text, re.IGNORECASE | re.DOTALL)
                if task_items:
                    for num, task in task_items:
                        task = task.strip()
                        task = re.sub(r'\n+', ' ', task)
                        task = re.sub(r'\s+', ' ', task)
                        if len(task) > 3:
                            tasks.append(f"{num}. {task}")
                    break
        return '\n'.join(tasks) if tasks else ''

    def _extract_section(self, text: str, section_type: str) -> str:
        patterns = self.SECTIONS.get(section_type, [])
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                section_text = match.group(1).strip()
                section_text = re.sub(r'\n+', ' ', section_text)
                section_text = re.sub(r'\s+', ' ', section_text)
                section_text = section_text.strip()
                if len(section_text) > 5:
                    return section_text
        return ''

test_text = """
Accomplishments
COMPLETED TASKS) 1 Data Modeling and Migration Implemented complex JSONB schemas for analytics persistence. 2 System Architecture and Algorithms Designed the RL Q-Table state-action mapping algorithm. 3 API Implementation and Documentation Developed RESTful endpoints using Django Rest Framework. 4 Frontend Component Development Built reusable glassmorphic UI components with TailwindCSS. 5 Initial Backend Setup with Django Configured PostgreSQL and Redis for production readiness. 6 Intelligence Analytics Computation Developed background processing workers for real-time scoring. 7 Middleware Security Implementation Secured API routes with custom JWT verification filters. 8 User Role Management System Implemented RBAC for Admins, Managers, and Interns. 9 Dynamic Filtering Monitoring Dashboard Created context-aware filters for cross-page navigation. 10 Hugging Face Router Integration Synchronized LLM task suggestions with the local RL agent. 11 RL Task Suggestion Engine Implemented the selection policy for personalized learning paths. 12 Q-Table Database Persistence Optimized database queries for high-frequency model updates. 13 Performance Metric Calculation Service Designed the logic for weighted engagement and quality scores. 14 SVG Intelligence Map Generator Created dynamic SVG visualizations for resident skill mapping. 15 Attendance Verification Logic Implemented geofencing-ready check-in/out logic. 16 Automated Task Assignment Logic Designed self-optimizing feedback loops for task difficulty. 17 Mission Control Design System Unified the UI/UX across all monitoring interfaces. 
II. ONGOING DEVELOPMENT (IN PROGRESS) 1 Data Augmentation Patterns Developing synthetic data generators for training robustness. 
III. IMPEDIMENTS & BLOCKERS 1 Anomaly Detection for Hiring On hold awaiting specialized HR dataset access. 
IV. CHALLENGES ENCOUNTERED Synchronized complex PDF extractions with backend Django processing logic. Resolved regex inconsistencies for multi-line task descriptions. 
V. KEY
Challenges ENCOUNTERED Synchronized complex PDF extractions with backend Django processing logic. Resolved regex inconsistencies for multi-line task descriptions. 
V. KEY
Learnings paths. 12 Q-Table Database Persistence Optimized database queries for high-frequency model updates. 
V. KEY
Next Week Goals FOR NEXT PERIOD Implement the shared InternSelector across the monitoring dashboard to ensure unified state management.
"""

parser = WeeklyReportParser()
result = parser.parse(test_text)

print(f"Tasks Completed Text:\n{result['tasks_completed']}")
print(f"\nTasks In Progress: {result['tasks_in_progress']}")
print(f"Tasks Blocked: {result['tasks_blocked']}")
print(f"Challenges: {result['challenges']}")
print(f"Learnings: {result['learnings']}")
print(f"Next Week Goals: {result['next_week_goals']}")

# Verify counts
tasks = result['tasks_completed'].split('\n')
count = len([t for t in tasks if l.strip()]) if result['tasks_completed'] else 0
print(f"\nCounted Tasks: {count}")
if count == 17:
    print("SUCCESS: Found 17 tasks!")
else:
    print(f"FAILURE: Found {count} tasks, expected 17.")
