from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import Project, ProjectAssignment, ProjectModule
from .serializers import ProjectSerializer, ProjectAssignmentSerializer, ProjectModuleSerializer

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
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        Approve a project (mark as COMPLETED from PENDING_APPROVAL).
        Only managers and admins can approve projects.
        """
        user = request.user
        
        if user.role not in ['MANAGER', 'ADMIN']:
            return Response(
                {'error': 'Permission denied. Only managers can approve projects.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            project_assignment = self.get_object()
        except ProjectAssignment.DoesNotExist:
            return Response(
                {'error': 'Project assignment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if project_assignment.status != 'PENDING_APPROVAL':
            return Response(
                {'error': f'Project is not pending approval. Current status: {project_assignment.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Approve the project
        project_assignment.status = 'COMPLETED'
        project_assignment.save()
        
        # Send notification to intern
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=project_assignment.intern,
            notification_type='PROJECT_APPROVED',
            title='Project Approved',
            message=f'Your project "{project_assignment.project.name}" has been approved by the manager.',
        )
        
        return Response({
            'message': 'Project approved successfully',
            'status': 'COMPLETED'
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        Reject a project (mark back to ACTIVE from PENDING_APPROVAL).
        Only managers and admins can reject projects.
        """
        user = request.user
        
        if user.role not in ['MANAGER', 'ADMIN']:
            return Response(
                {'error': 'Permission denied. Only managers can reject projects.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            project_assignment = self.get_object()
        except ProjectAssignment.DoesNotExist:
            return Response(
                {'error': 'Project assignment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if project_assignment.status != 'PENDING_APPROVAL':
            return Response(
                {'error': f'Project is not pending approval. Current status: {project_assignment.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('reason', '')
        
        # Reject the project - set back to ACTIVE
        project_assignment.status = 'ACTIVE'
        project_assignment.save()
        
        # Send notification to intern
        from apps.notifications.models import Notification
        message = f'Your project "{project_assignment.project.name}" has been sent back for revisions.'
        if rejection_reason:
            message += f' Reason: {rejection_reason}'
        
        Notification.objects.create(
            user=project_assignment.intern,
            notification_type='PROJECT_REJECTED',
            title='Project Sent Back',
            message=message,
        )
        
        return Response({
            'message': 'Project sent back for revisions',
            'status': 'ACTIVE'
        })

class ProjectModuleViewSet(viewsets.ModelViewSet):
    queryset = ProjectModule.objects.all()
    serializer_class = ProjectModuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        
        qs = ProjectModule.objects.all()
        if project_id:
            qs = qs.filter(project_id=project_id)
            
        if user.role == 'INTERN':
            # Modules for projects they are assigned to
            return qs.filter(project__assignments__intern=user)
        elif user.role == 'MANAGER':
            # Modules for projects they mentor
            return qs.filter(project__mentor=user)
        return qs
