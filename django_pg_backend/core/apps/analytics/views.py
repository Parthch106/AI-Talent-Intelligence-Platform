from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.interns.models import InternProfile
from apps.projects.models import Project
from apps.accounts.models import User

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        data = {}

        if user.role == 'ADMIN':
            data['total_managers'] = User.objects.filter(role=User.Role.MANAGER).count()
            data['total_interns'] = User.objects.filter(role=User.Role.INTERN).count()
            data['total_projects'] = Project.objects.count()
            data['active_projects'] = Project.objects.filter(status='IN_PROGRESS').count()
            data['role'] = 'ADMIN'
            
        elif user.role == 'MANAGER':
            # My Interns (assigned to my projects)
            my_interns_count = InternProfile.objects.filter(user__assigned_projects__project__mentor=user).distinct().count()
            data['total_interns'] = my_interns_count
            
            # My Projects
            my_projects = Project.objects.filter(mentor=user)
            data['total_projects'] = my_projects.count()
            data['active_projects'] = my_projects.filter(status='IN_PROGRESS').count()
            
            # Pending Reviews? (Placeholder logic)
            data['pending_reviews'] = 0 
            data['role'] = 'MANAGER'

        elif user.role == 'INTERN':
            # My Projects
            my_assignments = user.assigned_projects.all()
            data['assigned_projects'] = my_assignments.count()
            data['completed_projects'] = my_assignments.filter(status='COMPLETED').count()
            
            # My Feedback score (average?) - placeholder
            data['average_score'] = "N/A"
            data['role'] = 'INTERN'

        return Response(data)
