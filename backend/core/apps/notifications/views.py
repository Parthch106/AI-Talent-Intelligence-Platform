from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import Notification, SystemActivity
from apps.accounts.models import User
from apps.projects.models import ProjectAssignment
from apps.analytics.models import TaskTracking, PerformanceMetrics, WeeklyReport
import logging

logger = logging.getLogger(__name__)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get notifications for the current user with pagination and filtering."""
        user = request.user
        unread_only = request.query_params.get('unread_only') == 'true'
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        logger.info(f"Fetching notifications for user: {user.email}, unread_only: {unread_only}, page: {page}")
        
        query = Notification.objects.filter(user=user)
        if unread_only:
            query = query.filter(is_read=False)
            
        total_count = query.count()
        unread_count = Notification.objects.filter(user=user, is_read=False).count()
        
        start = (page - 1) * page_size
        end = start + page_size
        
        notifications = query.order_by('-created_at')[start:end]
        
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
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'has_more': end < total_count
        })


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Mark notification(s) as read or unread."""
        user = request.user
        notification_ids = request.data.get('notification_ids', [])
        notification_id = request.data.get('notification_id')
        action = request.data.get('action', 'read') # 'read' or 'unread'
        
        is_read = (action == 'read')

        if notification_id:
            notification_ids = [notification_id]

        if notification_ids:
            try:
                Notification.objects.filter(id__in=notification_ids, user=user).update(is_read=is_read)
                return Response({'message': f'Notification(s) marked as {action}'})
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Mark all as read/unread
            Notification.objects.filter(user=user).update(is_read=is_read)
            return Response({'message': f'All notifications marked as {action}'})


class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Delete notification(s)."""
        user = request.user
        notification_ids = request.data.get('notification_ids', [])
        notification_id = request.data.get('notification_id')
        clear_all = request.data.get('clear_all', False)

        if clear_all:
            Notification.objects.filter(user=user).delete()
            return Response({'message': 'All notifications deleted'})
        
        if notification_id:
            notification_ids = [notification_id]

        if notification_ids:
            try:
                deleted_count, _ = Notification.objects.filter(id__in=notification_ids, user=user).delete()
                return Response({'message': f'{deleted_count} notification(s) deleted'})
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'No notification specified'}, status=status.HTTP_400_BAD_REQUEST)


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
                        'link': f"/tasks?internId={task['intern_id']}&taskId={task.get('id')}"
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
                            'link': f"/tasks?internId={t.intern_id}&taskId={t.id}"
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
        now = timezone.now()
        alerts = []
        unread_count = Notification.objects.filter(user=user, is_read=False).count()

        # 1. Overdue Tasks Check (Admin/Manager see department/all, Intern sees own)
        overdue_tasks_qs = TaskTracking.objects.filter(
            due_date__lt=now,
            status__in=['ASSIGNED', 'IN_PROGRESS', 'REWORK']
        )

        if user.role == 'INTERN':
            my_overdue = overdue_tasks_qs.filter(intern=user)
            for task in my_overdue[:3]:
                alerts.append({
                    'id': f'overdue_{task.id}',
                    'type': 'critical',
                    'title': 'Task Overdue',
                    'message': f'Task "{task.title}" is past its deadline.',
                    'link': '/workspace/my-tasks'
                })
        else:
            dept_overdue = overdue_tasks_qs
            if user.role == 'MANAGER':
                dept_overdue = dept_overdue.filter(intern__department=user.department)
            
            for task in dept_overdue[:3]:
                alerts.append({
                    'id': f'overdue_{task.id}',
                    'type': 'critical',
                    'title': 'Overdue Task Alert',
                    'message': f'{task.intern.full_name}\'s task "{task.title}" is past due.',
                    'link': f'/management/tasks?internId={task.intern_id}'
                })

        # 2. Status Mismatches (Compare Weekly Reports vs DB)
        if user.role in ['ADMIN', 'MANAGER']:
            # Check most recent reports in the last 14 days
            recent_reports = WeeklyReport.objects.filter(
                submitted_at__gte=now - timedelta(days=14)
            )
            if user.role == 'MANAGER':
                recent_reports = recent_reports.filter(intern__department=user.department)
            
            for report in recent_reports[:5]:
                # Simple check: compare tasks_completed in report vs database
                db_completed = TaskTracking.objects.filter(
                    intern=report.intern,
                    status='COMPLETED',
                    completed_at__range=(report.week_start_date, report.week_end_date + timedelta(days=1))
                ).count()
                
                if report.tasks_completed != db_completed:
                    alerts.append({
                        'id': f'mismatch_{report.id}',
                        'type': 'warning',
                        'title': 'Status Mismatch',
                        'message': f'Data mismatch detected for {report.intern.full_name}\'s week {report.week_start_date}.',
                        'link': f'/management/reports?internId={report.intern_id}'
                    })

        # 3. Missing Weekly Report (If it's Friday or later)
        # Weekday 4 = Friday
        if now.weekday() >= 4:
            current_week_start = (now - timedelta(days=now.weekday())).date()
            if user.role == 'INTERN':
                has_report = WeeklyReport.objects.filter(
                    intern=user, 
                    week_start_date=current_week_start
                ).exists()
                if not has_report:
                    alerts.append({
                        'id': f'missing_report_{current_week_start}',
                        'type': 'warning',
                        'title': 'Report Due Soon',
                        'message': 'Don\'t forget to stage and upload your weekly report before the weekend.',
                        'link': '/workspace/submit-report'
                    })

        # 4. Burnout/Risk Signals (Insights)
        risk_metrics = PerformanceMetrics.objects.filter(
            period_end__gte=now - timedelta(days=7),
            dropout_risk__in=['MEDIUM', 'HIGH']
        )
        if user.role == 'INTERN':
            risk_metrics = risk_metrics.filter(intern=user)
        elif user.role == 'MANAGER':
            risk_metrics = risk_metrics.filter(intern__department=user.department)
        
        for metric in risk_metrics[:2]:
            alerts.append({
                'id': f'risk_{metric.id}',
                'type': 'insight',
                'title': 'Performance Insight',
                'message': f'Engagement risk detected for {metric.intern.full_name if user.role != "INTERN" else "your profile"}.',
                'link': '/analytics/performance' if user.role != "INTERN" else '/my-tasks'
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
