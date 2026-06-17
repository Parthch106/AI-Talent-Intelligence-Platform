from rest_framework import viewsets, permissions
from .models import Assessment, AssessmentSubmission
from .serializers import AssessmentSerializer, AssessmentSubmissionSerializer


class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            # Managers see assessments for interns assigned to their projects
            return Assessment.objects.filter(
                created_by=user
            ).distinct()
        return Assessment.objects.all()


class AssessmentSubmissionViewSet(viewsets.ModelViewSet):
    queryset = AssessmentSubmission.objects.all()
    serializer_class = AssessmentSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            # Managers see submissions for interns assigned to their projects
            return AssessmentSubmission.objects.filter(
                assessment__created_by=user
            )
        elif user.role == 'INTERN':
            return AssessmentSubmission.objects.filter(intern=user)
        return AssessmentSubmission.objects.all()
