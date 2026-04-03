"""
Test script to create sample data for pending reviews functionality.
Run this to test the Pending Reviews card on manager dashboard.

Usage:
    cd django_pg_backend/core
    python manage.py shell < test_pending_reviews.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import User
from apps.analytics.models import TaskTracking
from apps.projects.models import Project

def create_test_data():
    """Create test data for pending reviews"""
    
    print("Creating test data for pending reviews...")
    
    # Get or create a manager
    manager = User.objects.filter(role=User.Role.MANAGER).first()
    if not manager:
        print("No manager found. Please create a manager user first.")
        return
    
    # Get or create an intern in the same department
    intern = User.objects.filter(
        role=User.Role.INTERN,
        department=manager.department
    ).first()
    
    if not intern:
        print(f"No intern found in department '{manager.department}'. Creating one...")
        intern = User.objects.create_user(
            username='test_intern',
            email='test_intern@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Intern',
            role=User.Role.INTERN,
            department=manager.department
        )
        print(f"Created intern: {intern.username}")
    
    # Create some submitted tasks (these will show as pending reviews)
    submitted_tasks = [
        {
            'title': 'Fix login bug',
            'description': 'Users cannot login with special characters in password',
            'status': 'SUBMITTED',
            'priority': 'HIGH'
        },
        {
            'title': 'Update documentation',
            'description': 'API documentation needs updating',
            'status': 'SUBMITTED',
            'priority': 'MEDIUM'
        },
        {
            'title': 'Code review request',
            'description': 'Review the new payment module',
            'status': 'SUBMITTED',
            'priority': 'HIGH'
        }
    ]
    
    # Create tasks with SUBMITTED status
    for i, task_data in enumerate(submitted_tasks):
        task_id = f'TASK-TEST-{i+1}'
        
        task, created = TaskTracking.objects.get_or_create(
            task_id=task_id,
            defaults={
                'intern': intern,
                'title': task_data['title'],
                'description': task_data['description'],
                'status': task_data['status'],
                'priority': task_data['priority'],
                'due_date': timezone.now() + timedelta(days=7),
                'estimated_hours': 8.0,
            }
        )
        
        if created:
            print(f"Created task: {task.title} (status: {task.status})")
        else:
            print(f"Task already exists: {task.title}")
    
    # Create some other status tasks for comparison
    other_statuses = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED']
    for status in other_statuses:
        task_id = f'TASK-{status}-{intern.id}'
        task, created = TaskTracking.objects.get_or_create(
            task_id=task_id,
            defaults={
                'intern': intern,
                'title': f'Task with status {status}',
                'description': f'This task has status {status}',
                'status': status,
                'priority': 'MEDIUM',
                'due_date': timezone.now() + timedelta(days=7),
                'estimated_hours': 8.0,
            }
        )
        if created:
            print(f"Created task: {task.title} (status: {task.status})")
    
    # Print summary
    print("\n" + "="*50)
    print("Test data created!")
    print("="*50)
    
    # Show counts
    total_tasks = TaskTracking.objects.filter(intern=intern).count()
    submitted = TaskTracking.objects.filter(intern=intern, status='SUBMITTED').count()
    print(f"\nTotal tasks for {intern.username}: {total_tasks}")
    print(f"Submitted tasks (pending reviews): {submitted}")
    print(f"\nManager: {manager.username} (dept: {manager.department})")
    print(f"Intern: {intern.username} (dept: {intern.department})")
    
    print("\nTest the dashboard by logging in as the manager.")
    print("The Pending Reviews card should now show: 3")

if __name__ == '__main__':
    create_test_data()
