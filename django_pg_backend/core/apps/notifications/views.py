from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import Notification, SystemActivity
from apps.accounts.models import User
from apps.projects.models import ProjectAssignment
from apps.analytics.models import TaskTracking, PerformanceMetrics


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get notifications for the current user."""
        user = request.user
        notifications = Notification.objects.filter(user=user).order_by('-created_at')[:20]
        
        unread_count = Notification.objects.filter(user=user, is_read=False).count()

        data = [{
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat(),
        } for n in notifications]

        return Response({
            'notifications': data,
            'unread_count': unread_count,
        })


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Mark a notification as read."""
        user = request.user
        notification_id = request.data.get('notification_id')

        if notification_id:
            try:
                notification = Notification.objects.get(id=notification_id, user=user)
                notification.is_read = True
                notification.save()
                return Response({'message': 'Notification marked as read'})
            except Notification.DoesNotExist:
                return Response(
                    {'error': 'Notification not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Mark all as read
            Notification.objects.filter(user=user, is_read=False).update(is_read=True)
            return Response({'message': 'All notifications marked as read'})


class ActivityLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get activity log based on user role."""
        user = request.user
        days = int(request.query_params.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)

        activities = SystemActivity.objects.filter(created_at__gte=start_date)

        # Filter based on user role
        if user.role == User.Role.MANAGER:
            # Get activities for interns in manager's department
            intern_ids = User.objects.filter(
                role=User.Role.INTERN,
                department=user.department
            ).values_list('id', flat=True)
            
            # Get task completions for these interns
            task_activities = TaskTracking.objects.filter(
                intern_id__in=list(intern_ids),
                completed_at__gte=start_date
            ).values('intern_id', 'title', 'completed_at', 'status')
            
            activities = activities | SystemActivity.objects.filter(
                created_at__gte=start_date,
                metadata__contains={'department': user.department}
            )
            
            # Build manager-specific activities
            manager_activities = []
            for task in task_activities:
                intern = User.objects.get(id=task['intern_id'])
                manager_activities.append({
                    'id': f"task_{task['completed_at'].timestamp()}",
                    'type': 'TASK_COMPLETED',
                    'description': f"{intern.full_name} completed task: {task['title']}",
                    'created_at': task['completed_at'].isoformat(),
                    'icon': 'check-circle',
                    'color': 'green',
                })
        elif user.role == User.Role.INTERN:
            # Get activities for this intern
            intern_activities = TaskTracking.objects.filter(
                intern=user,
                created_at__gte=start_date
            ).order_by('-created_at')[:10]
            
            manager_activities = [{
                'id': f"task_{a.completed_at.timestamp() if a.completed_at else a.created_at.timestamp()}",
                'type': 'TASK',
                'description': f"Task '{a.title}' status: {a.status}",
                'created_at': (a.completed_at or a.created_at).isoformat(),
                'icon': 'clipboard',
                'color': 'purple',
            } for a in intern_activities]
        else:
            # Admin sees all recent activities
            recent_tasks = TaskTracking.objects.filter(
                completed_at__gte=start_date
            ).select_related('intern')[:20]
            
            manager_activities = [{
                'id': f"task_{t.completed_at.timestamp()}",
                'type': 'TASK_COMPLETED',
                'description': f"{t.intern.full_name} completed: {t.title}",
                'created_at': t.completed_at.isoformat(),
                'icon': 'check-circle',
                'color': 'green',
            } for t in recent_tasks]

        # Add system activities
        system_activities = [{
            'id': f"sys_{a.id}",
            'type': a.activity_type,
            'description': a.description,
            'created_at': a.created_at.isoformat(),
            'icon': 'zap',
            'color': 'purple',
        } for a in activities[:10]]

        all_activities = sorted(
            manager_activities + system_activities,
            key=lambda x: x['created_at'],
            reverse=True
        )[:10]

        return Response({
            'activities': all_activities,
            'user_role': user.role,
        })


class DashboardNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get dashboard notifications and alerts for the current user."""
        user = request.user
        alerts = []
        unread_count = Notification.objects.filter(user=user, is_read=False).count()

        # Generate alerts based on user role
        if user.role == User.Role.ADMIN:
            # System-wide alerts
            total_interns = User.objects.filter(role=User.Role.INTERN).count()
            total_managers = User.objects.filter(role=User.Role.MANAGER).count()
            
            alerts.append({
                'type': 'info',
                'title': 'System Overview',
                'message': f'{total_interns} interns and {total_managers} managers active',
            })
            
        elif user.role == User.Role.MANAGER:
            # Manager alerts - interns in their department
            interns = User.objects.filter(role=User.Role.INTERN, department=user.department)
            
            for intern in interns[:3]:
                # Check for pending tasks
                pending_tasks = TaskTracking.objects.filter(
                    intern=intern,
                    status__in=['ASSIGNED', 'IN_PROGRESS']
                ).count()
                
                if pending_tasks > 0:
                    alerts.append({
                        'type': 'warning',
                        'title': 'Pending Tasks',
                        'message': f'{intern.full_name} has {pending_tasks} pending tasks',
                    })
                    
        else:  # INTERN
            # Intern alerts
            pending_tasks = TaskTracking.objects.filter(
                intern=user,
                status__in=['ASSIGNED', 'IN_PROGRESS']
            ).count()
            
            if pending_tasks > 0:
                alerts.append({
                    'type': 'info',
                    'title': 'Pending Tasks',
                    'message': f'You have {pending_tasks} tasks awaiting completion',
                })

        return Response({
            'alerts': alerts,
            'unread_notifications': unread_count,
        })


def create_notification(user, notification_type, title, message):
    """Helper function to create a notification."""
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
    )


def create_system_activity(activity_type, description, metadata=None):
    """Helper function to create a system activity."""
    return SystemActivity.objects.create(
        activity_type=activity_type,
        description=description,
        metadata=metadata or {},
    )
