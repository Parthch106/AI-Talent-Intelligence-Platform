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
    pagination_class = None  # Disable pagination

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


class AvailableInternsView(views.APIView):
    """API endpoint to get interns available for assignment (no profile yet) in manager's department"""
    permission_classes = [IsAuthenticated, IsManager]
    
    def get(self, request):
        """Get interns without profiles in the manager's department"""
        if not request.user.department:
            return Response(
                {'error': 'Manager has no department assigned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get interns in the same department who don't have a profile yet
        interns = User.objects.filter(
            role=User.Role.INTERN,
            department=request.user.department
        ).exclude(
            id__in=InternProfile.objects.values('user_id')
        )
        
        from apps.accounts.serializers import UserSerializer
        serializer = UserSerializer(interns, many=True)
        return Response(serializer.data)


class AssignInternView(views.APIView):
    """API endpoint to assign an intern to the manager by creating their profile"""
    permission_classes = [IsAuthenticated, IsManager]
    
    def post(self, request):
        """Create an intern profile for an existing user"""
        intern_id = request.data.get('intern_id')
        
        if not intern_id:
            return Response(
                {'error': 'Intern ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if intern already has a profile
        if InternProfile.objects.filter(user=user).exists():
            return Response(
                {'error': 'Intern already has a profile'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create intern profile
        profile = InternProfile.objects.create(
            user=user,
            university=user.department or '',  # Use department as university fallback
            phone_number='',
            status='ACTIVE'
        )
        
        serializer = InternProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DepartmentInternsView(views.APIView):
    """API endpoint to get interns in the manager's or intern's department"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Both managers and interns can see department interns
        if request.user.role not in [User.Role.MANAGER, User.Role.INTERN]:
            return Response(
                {'error': 'Only managers and interns can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interns = User.objects.filter(
            role=User.Role.INTERN,
            department=request.user.department
        )
        from apps.accounts.serializers import UserSerializer
        serializer = UserSerializer(interns, many=True)
        return Response(serializer.data)


class AllInternsByDepartmentView(views.APIView):
    """API endpoint to get all interns grouped by department for admins"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Only admins can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all interns grouped by department
        departments = User.objects.filter(
            role=User.Role.INTERN
        ).values_list('department', flat=True).distinct()
        
        result = {}
        for dept in departments:
            if dept:  # Skip empty departments
                interns = User.objects.filter(
                    role=User.Role.INTERN,
                    department=dept
                )
                from apps.accounts.serializers import UserSerializer
                result[dept] = UserSerializer(interns, many=True).data
        
        return Response(result)


class MyProfileView(views.APIView):
    """API endpoint to get and update current user's profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's profile based on role"""
        user = request.user
        
        if user.role == User.Role.INTERN:
            # Get intern profile
            try:
                profile = InternProfile.objects.get(user=user)
                from .serializers import InternProfileSerializer
                return Response({
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'department': user.department,
                    },
                    'profile': InternProfileSerializer(profile).data
                })
            except InternProfile.DoesNotExist:
                return Response({
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.role,
                        'department': user.department,
                    },
                    'profile': None
                })
        else:
            # Admin and Manager - return user data
            from apps.accounts.serializers import UserSerializer
            return Response({
                'user': UserSerializer(user).data,
                'profile': None
            })
    
    def patch(self, request):
        """Update current user's profile based on role"""
        user = request.user
        
        if user.role == User.Role.INTERN:
            # Update intern profile
            try:
                profile = InternProfile.objects.get(user=user)
            except InternProfile.DoesNotExist:
                profile = InternProfile.objects.create(user=user)
            
            profile_data = request.data.get('profile', {})
            
            # Update profile fields (only if provided)
            if 'university' in profile_data:
                profile.university = profile_data['university']
            if 'phone_number' in profile_data:
                profile.phone_number = profile_data['phone_number']
            if 'skills' in profile_data:
                profile.skills = profile_data['skills']
            if 'status' in profile_data:
                profile.status = profile_data['status']
            if 'github_profile' in profile_data:
                profile.github_profile = profile_data['github_profile']
            if 'linkedin_profile' in profile_data:
                profile.linkedin_profile = profile_data['linkedin_profile']
            if 'gpa' in profile_data:
                profile.gpa = profile_data['gpa']
            if 'graduation_year' in profile_data:
                profile.graduation_year = profile_data['graduation_year']
            
            profile.save()
            
            from .serializers import InternProfileSerializer
            return Response({
                'message': 'Profile updated successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role,
                    'department': user.department,
                },
                'profile': InternProfileSerializer(profile).data
            })
        else:
            # Admin and Manager - update user data
            user_data = request.data.get('user', {})
            
            if 'full_name' in user_data:
                user.full_name = user_data['full_name']
            if 'department' in user_data and user.role == User.Role.ADMIN:
                user.department = user_data['department']
            
            user.save()
            
            from apps.accounts.serializers import UserSerializer
            return Response({
                'message': 'Profile updated successfully',
                'user': UserSerializer(user).data
            })


class ProfileByUserIdView(views.APIView):
    """API endpoint to get intern profile by user ID"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        """Get profile for a specific user"""
        try:
            profile = InternProfile.objects.get(user_id=user_id)
            return Response(InternProfileSerializer(profile).data)
        except InternProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
