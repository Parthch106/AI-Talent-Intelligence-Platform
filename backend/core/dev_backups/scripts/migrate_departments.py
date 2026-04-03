import os
import django
import sys

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User

def migrate_departments():
    mapping = {
        'AI/ML': 'AI/ML Department',
        'Engineering': 'Software Engineering',
        'AI,ML,DS': 'AI/ML Department',
        'Web Development': 'Web Development',
        'BACKEND DEVELOPER': 'Web Development',
        'DATA SCIENTIST': 'Data Science',
        'DEVOPS ENGINEER': 'Cloud & DevOps',
        'FRONTEND DEVELOPER': 'Web Development',
        'FULL STACK DEVELOPER': 'Web Development',
        'ML ENGINEER': 'AI/ML Department',
        'MOBILE DEVELOPER': 'Mobile Applications',
        'SOFTWARE ENGINEER': 'Software Engineering',
    }

    print("Starting department migration...")
    count = 0
    
    # Case-insensitive mapping and trimming
    users = User.objects.all()
    for user in users:
        old_dept = user.department.strip()
        if not old_dept:
            continue
            
        # Try exact match or case-insensitive match
        new_dept = mapping.get(old_dept)
        if not new_dept:
            # Try uppercase match
            new_dept = mapping.get(old_dept.upper())
            
        if new_dept and new_dept != old_dept:
            print(f"Updating user {user.email}: '{old_dept}' -> '{new_dept}'")
            user.department = new_dept
            user.save()
            count += 1
            
    print(f"Migration completed. {count} users updated.")

if __name__ == "__main__":
    migrate_departments()
