from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Feedback
from .serializers import FeedbackSerializer
from apps.accounts.models import User


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            # Managers see feedback they've given and feedback for interns in their projects
            return Feedback.objects.filter(
                Q(reviewer=user) | Q(recipient__assigned_projects__project__mentor=user)
            ).distinct()
        elif user.role == 'INTERN':
            # Interns see feedback they've received
            return Feedback.objects.filter(recipient=user)
        # Admin sees all feedback
        return Feedback.objects.all()

    def perform_create(self, serializer):
        # Set the reviewer to the current user
        serializer.save(reviewer=self.request.user)

    def create(self, request, *args, **kwargs):
        user = request.user
        recipient_id = request.data.get('recipient_id')
        
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
