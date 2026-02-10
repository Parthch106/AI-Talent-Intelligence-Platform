from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Project, ProjectAssignment
from .serializers import ProjectSerializer, ProjectAssignmentSerializer
from django.db.models import Q

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'INTERN':
            # Projects they are assigned to
            return Project.objects.filter(assignments__intern=user)
        elif user.role == 'MANAGER':
             # Projects where they are the mentor
            return Project.objects.filter(mentor=user)
        return Project.objects.all()

    def perform_create(self, serializer):
        # Allow mentor to be set automatically if not provided, or logic can be refined
        if self.request.user.role == "MANAGER":
            serializer.save(mentor=self.request.user)
        else:
            serializer.save()

class ProjectAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ProjectAssignment.objects.all()
    serializer_class = ProjectAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "INTERN":
             return ProjectAssignment.objects.filter(intern=user)
        elif user.role == "MANAGER":
             # Assignments in their projects
             return ProjectAssignment.objects.filter(project__mentor=user)
        return ProjectAssignment.objects.all()
