from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from .models import Feedback
from .serializers import FeedbackSerializer
from apps.accounts.models import User
from apps.notifications.models import Notification


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            # Managers see all feedback they've given historically
            # This ensures historical feedback is visible regardless of current project assignments
            return Feedback.objects.filter(reviewer=user).order_by('-created_at')
        elif user.role == 'INTERN':
            # Interns see all feedback they've received (including historical)
            return Feedback.objects.filter(recipient=user).order_by('-created_at')
        # Admin sees all feedback
        return Feedback.objects.all().order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def _create_feedback_notification(self, feedback):
        """Create a notification when feedback is received."""
        task_info = f" for task '{feedback.task.title}'" if feedback.task else ""
        
        # Determine message based on task status
        if feedback.task_status == 'COMPLETED_APPROVED':
            title = "Task Approved! 🎉"
            message = f"Your work on task '{feedback.task.title}' has been approved!{feedback.comments[:100] if feedback.comments else ''}"
        elif feedback.task_status == 'COMPLETED_REWORK':
            title = "Feedback: Needs Rework"
            message = f"Feedback received for task '{feedback.task.title}'. Please review the comments.{feedback.comments[:100] if feedback.comments else ''}"
        else:
            title = "New Feedback Received"
            message = f"You have received new feedback{task_info}.{feedback.comments[:100] if feedback.comments else ''}"
        
        Notification.objects.create(
            user=feedback.recipient,
            notification_type='FEEDBACK_RECEIVED',
            title=title,
            message=message
        )

    def perform_create(self, serializer):
        # Set the reviewer to the current user
        feedback = serializer.save(reviewer=self.request.user)
        
        # Create notification for the recipient
        self._create_feedback_notification(feedback)

    def create(self, request, *args, **kwargs):
        user = request.user
        recipient_id = request.data.get('recipient_id')
        task_id = request.data.get('task_id')
        
        # Role-based validation
        if user.role == 'MANAGER':
            # Manager can only give feedback to interns
            try:
                recipient = User.objects.get(id=recipient_id)
                if recipient.role != User.Role.INTERN:
                    return Response(
                        {'error': 'Managers can only give feedback to interns'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except User.DoesNotExist:
                return Response(
                    {'error': 'Recipient not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Admin can give feedback to anyone (managers and interns)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark feedback as read."""
        feedback = self.get_object()
        
        # Only the recipient can mark feedback as read
        if request.user != feedback.recipient and request.user.role != 'MANAGER':
            return Response(
                {'error': 'You can only mark your own feedback as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        feedback.is_read = True
        feedback.read_at = timezone.now()
        feedback.save()
        
        return Response({'status': 'Feedback marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread feedback count for current user."""
        user = request.user
        unread_count = Feedback.objects.filter(
            recipient=user,
            is_read=False
        ).count()
        
        return Response({'unread_count': unread_count})

    @action(detail=False, methods=['get'])
    def my_feedback(self, request):
        """Get feedback received by the current user (intern)."""
        feedbacks = Feedback.objects.filter(
            recipient=request.user
        ).order_by('-created_at')
        
        serializer = self.get_serializer(feedbacks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def given_feedback(self, request):
        """Get feedback given by the current user (manager)."""
        feedbacks = Feedback.objects.filter(
            reviewer=request.user
        ).order_by('-created_at')
        
        serializer = self.get_serializer(feedbacks, many=True)
        return Response(serializer.data)
