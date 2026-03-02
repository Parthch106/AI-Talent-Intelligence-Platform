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
import logging

logger = logging.getLogger(__name__)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get notifications for the current user."""
        user = request.user
        logger.info(f"Fetching notifications for user: {user.email}, id: {user.id}")
        
        notifications = Notification.objects.filter(user=user).order_by('-created_at')[:20]
        
        unread_count = Notification.objects.filter(user=user, is_read=False).count()
        
        logger.info(f"Found {notifications.count()} notifications for user {user.email}")

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
        manager_activities = []

        # Filter based on user role
        try:
            if str(user.role) == str(User.Role.MANAGER):
                # Get activities for interns in manager's department
                intern_ids = User.objects.filter(
                    role=User.Role.INTERN,
                    department=user.department
                ).values_list('id', flat=True)
                
                # Get task completions for these interns
                task_activities = TaskTracking.objects.filter(
                    intern_id__in=list(intern_ids),
                    completed_at__gte=start_date
                ).values('id', 'intern_id', 'title', 'completed_at', 'status')
                
                activities = activities | SystemActivity.objects.filter(
                    created_at__gte=start_date,
                    metadata__contains={'department': user.department}
                )
                
                # Build manager-specific activities
                for task in task_activities:
                    try:
                        intern = User.objects.get(id=task['intern_id'])
                        intern_name = intern.full_name if intern else 'Unknown'
                    except User.DoesNotExist:
                        intern_name = 'Unknown'
                    
                    manager_activities.append({
                        'id': f"task_{task['completed_at'].timestamp()}",
                        'type': 'TASK_COMPLETED',
                        'task_id': task.get('id'),
                        'intern_id': task['intern_id'],
                        'description': f"{intern_name} completed task: {task['title']}",
                        'created_at': task['completed_at'].isoformat(),
                        'icon': 'check-circle',
                        'color': 'green',
                        'link': '/monitoring/tasks'
                    })
            elif str(user.role) == str(User.Role.INTERN):
                # Get activities for this intern
                try:
                    intern_activities = TaskTracking.objects.filter(
                        intern=user,
                        assigned_at__gte=start_date
                    ).order_by('-assigned_at')[:10]
                    
                    for a in intern_activities:
                        created_at = a.completed_at or a.assigned_at
                        act_id = f"task_{created_at.timestamp()}" if created_at else f"task_{a.id}"
                        manager_activities.append({
                            'id': act_id,
                            'type': 'TASK',
                            'task_id': a.id,
                            'intern_id': a.intern_id,
                            'description': f"Task '{a.title}' status: {a.status}",
                            'created_at': created_at.isoformat() if created_at else timezone.now().isoformat(),
                            'icon': 'clipboard',
                            'color': 'purple',
                            'link': '/my-tasks'
                        })
                except Exception as e:
                    logger.warning(f"Error fetching intern activities: {e}")
            else:  # ADMIN or default
                # Admin sees all recent activities
                try:
                    recent_tasks = TaskTracking.objects.filter(
                        completed_at__gte=start_date
                    ).select_related('intern')[:20]
                    
                    for t in recent_tasks:
                        intern_name = t.intern.full_name if t.intern else 'Unknown'
                        manager_activities.append({
                            'id': f"task_{t.completed_at.timestamp()}",
                            'type': 'TASK_COMPLETED',
                            'task_id': t.id,
                            'intern_id': t.intern_id,
                            'description': f"{intern_name} completed: {t.title}",
                            'created_at': t.completed_at.isoformat(),
                            'icon': 'check-circle',
                            'color': 'green',
                            'link': '/monitoring/tasks'
                        })
                except Exception as e:
                    logger.warning(f"Error fetching admin activities: {e}")
        except Exception as e:
            logger.error(f"Error in ActivityLogView: {e}")

        # Add system activities
        try:
            system_activities = [{
                'id': f"sys_{a.id}",
                'type': a.activity_type,
                'description': a.description,
                'created_at': a.created_at.isoformat(),
                'icon': 'zap',
                'color': 'purple',
                'link': None
            } for a in activities[:10]]
        except Exception as e:
            logger.warning(f"Error fetching system activities: {e}")
            system_activities = []

        # If still no activities, add user notifications as fallback
        if not manager_activities and not system_activities:
            try:
                user_notifications = Notification.objects.filter(
                    user=user
                ).order_by('-created_at')[:5]
                
                for n in user_notifications:
                    manager_activities.append({
                        'id': f"notif_{n.id}",
                        'type': n.notification_type,
                        'description': n.message,
                        'created_at': n.created_at.isoformat(),
                        'icon': 'bell',
                        'color': 'blue',
                        'link': '/my-tasks'
                    })
            except Exception as e:
                logger.warning(f"Error fetching notifications: {e}")

        all_activities = sorted(
            manager_activities + system_activities,
            key=lambda x: x.get('created_at', ''),
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
        if str(user.role) == str(User.Role.ADMIN):
            # System-wide alerts
            total_interns = User.objects.filter(role=User.Role.INTERN).count()
            total_managers = User.objects.filter(role=User.Role.MANAGER).count()
            
            alerts.append({
                'type': 'info',
                'title': 'System Overview',
                'message': f'{total_interns} interns and {total_managers} managers active',
            })
            
        elif str(user.role) == str(User.Role.MANAGER):
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


class NotificationCreateTestView(APIView):
    """Test view to create sample notifications."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a test notification for the current user."""
        user = request.user
        logger.info(f"Creating test notification for user: {user.email}, id: {user.id}")
        
        # Create a test notification
        notification = Notification.objects.create(
            user=user,
            notification_type='INFO',
            title='Welcome to AI Talent Intelligence Platform',
            message='This is a test notification to verify the notification system is working correctly.',
        )
        
        logger.info(f"Created notification id: {notification.id} for user {user.email}")
        
        return Response({
            'message': 'Test notification created',
            'notification': {
                'id': notification.id,
                'type': notification.notification_type,
                'title': notification.title,
                'message': notification.message,
            }
        }, status=status.HTTP_201_CREATED)
