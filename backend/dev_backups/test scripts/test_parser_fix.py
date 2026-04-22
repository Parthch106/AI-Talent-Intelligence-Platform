from apps.analytics.services.weekly_report_parser import WeeklyReportParser

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
count = len([t for t in tasks if t.strip()])
print(f"\nCounted Tasks: {count}")
if count == 17:
    print("SUCCESS: Found 17 tasks!")
else:
    print(f"FAILURE: Found {count} tasks, expected 17.")
