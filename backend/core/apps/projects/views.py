from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import Project, ProjectAssignment, ProjectModule
from .serializers import ProjectSerializer, ProjectAssignmentSerializer, ProjectModuleSerializer
from .services.llm_project_generator import get_project_generator

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

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def modules(self, request, pk=None):
        """
        Get all modules for a specific project.
        """
        try:
            project = self.get_object()
            modules = ProjectModule.objects.filter(project=project)
            serializer = ProjectModuleSerializer(modules, many=True)
            return Response(serializer.data)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_module(self, request, pk=None):
        """
        Add a new module to a specific project.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"add_module called with pk={pk}, data={request.data}")

        try:
            project = self.get_object()
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        logger.info(f"Project found: {project.name}")
        serializer = ProjectModuleSerializer(data=request.data)
        logger.info(f"Serializer errors: {serializer.errors}")

        if serializer.is_valid():
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def suggest_projects(self, request):
        """
        Generate AI-powered project suggestions based on department and experience level.

        Request body:
        {
            "department": "Web Development",
            "experience_level": "BEGINNER",
            "num_suggestions": 3
        }
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"suggest_projects called with data={request.data}")

        department = request.data.get('department')
        experience_level = request.data.get('experience_level', 'BEGINNER')
        num_suggestions = request.data.get('num_suggestions', 3)
        description = request.data.get('description', '')
        skills = request.data.get('skills', '')
        duration = request.data.get('duration', '3 months')

        if not department:
            return Response(
                {'error': 'Department is required for project suggestions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project_generator = get_project_generator()
            result = project_generator.generate_project_suggestions(
                department=department,
                experience_level=experience_level,
                num_suggestions=num_suggestions,
                include_modules=True,
                description=description,
                skills=skills,
                duration=duration
            )

            if 'error' in result:
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error generating project suggestions: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProjectAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ProjectAssignment.objects.all()
    serializer_class = ProjectAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        intern_id = self.request.query_params.get('intern_id')
        
        if user.role == "INTERN":
              return ProjectAssignment.objects.filter(intern=user)
        elif user.role == "MANAGER":
              # Assignments in their projects
              qs = ProjectAssignment.objects.filter(project__mentor=user)
              if intern_id:
                  qs = qs.filter(intern_id=intern_id)
              return qs
        
        # ADMIN sees all, but can also filter by intern_id
        qs = ProjectAssignment.objects.all()
        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        return qs

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
        intern_id = self.request.query_params.get('intern_id')

        qs = ProjectModule.objects.all()
        if project_id:
            qs = qs.filter(project_id=project_id)
        
        if intern_id:
            qs = qs.filter(project__assignments__intern_id=intern_id)

        if user.role == 'INTERN':
            # Modules for projects they are assigned to
            return qs.filter(project__assignments__intern=user).distinct()
        elif user.role == 'MANAGER':
            # Modules for projects they mentor
            return qs.filter(project__mentor=user).distinct()
        return qs.distinct()
