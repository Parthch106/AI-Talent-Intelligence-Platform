from rest_framework import viewsets, permissions
from .models import Feedback
from .serializers import FeedbackSerializer


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            # Managers see feedback they've given and feedback for interns in their projects
            return Feedback.objects.filter(
                reviewer=user
            ) | Feedback.objects.filter(
                recipient__assigned_projects__project__mentor=user
            ).distinct()
        elif user.role == 'INTERN':
            return Feedback.objects.filter(recipient=user)
        return Feedback.objects.all()
