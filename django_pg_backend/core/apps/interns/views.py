from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import InternProfile
from .serializers import InternProfileSerializer
from apps.accounts.models import User
from apps.accounts.permissions import IsManager

class InternProfileViewSet(viewsets.ModelViewSet):
    queryset = InternProfile.objects.all()
    serializer_class = InternProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'INTERN':
            return InternProfile.objects.filter(user=user)
        elif user.role == 'MANAGER':
            # Managers see only interns in their department
            return InternProfile.objects.filter(user__department=user.department)
        # Admin sees all interns
        return InternProfile.objects.all()

    def perform_create(self, serializer):  
        serializer.save(user=self.request.user)


class CreateInternView(views.APIView):
    permission_classes = [IsAuthenticated, IsManager]
    
    def post(self, request):
        user_data = request.data.get('user', {})
        profile_data = request.data.get('profile', {})
        
        # Create user with manager's department
        user = User.objects.create_user(
            email=user_data.get('email'),
            password=user_data.get('password'),
            full_name=user_data.get('full_name'),
            role=User.Role.INTERN,
            department=request.user.department
        )
        
        # Create intern profile
        profile = InternProfile.objects.create(
            user=user,
            university=profile_data.get('university', ''),
            phone_number=profile_data.get('phone_number', ''),
            gpa=profile_data.get('gpa'),
            graduation_year=profile_data.get('graduation_year'),
            github_profile=profile_data.get('github_profile', ''),
            linkedin_profile=profile_data.get('linkedin_profile', ''),
            skills=profile_data.get('skills', []),
            status=profile_data.get('status', 'ACTIVE')
        )
        
        serializer = InternProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DepartmentInternsView(views.APIView):
    """API endpoint to get interns in the manager's department"""
    permission_classes = [IsAuthenticated, IsManager]
    
    def get(self, request):
        interns = User.objects.filter(
            role=User.Role.INTERN,
            department=request.user.department
        )
        from apps.accounts.serializers import UserSerializer
        serializer = UserSerializer(interns, many=True)
        return Response(serializer.data)
