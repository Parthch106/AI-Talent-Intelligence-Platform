from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import InternProfile
from .serializers import InternProfileSerializer
from apps.accounts.models import User
from apps.accounts.permissions import IsManager, IsAdmin

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
            managed_depts = [d.strip() for d in user.department.split(',') if d.strip()]
            return InternProfile.objects.filter(user__department__in=managed_depts)
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
        managed_depts = [d.strip() for d in request.user.department.split(',') if d.strip()]
        interns = User.objects.filter(
            role=User.Role.INTERN,
            department__in=managed_depts
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


class DeleteInternView(views.APIView):
    """
    DELETE /api/interns/<intern_id>/delete/
    Deletes an intern User and cascades to their Profile, records, etc.
    Only accessible by ADMIN.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, intern_id):
        try:
            intern = User.objects.get(pk=intern_id, role=User.Role.INTERN)
            intern.delete()
            return Response({'message': 'Intern deleted successfully.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Intern not found.'}, status=status.HTTP_404_NOT_FOUND)


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
        
        managed_depts = [d.strip() for d in request.user.department.split(',') if d.strip()]
        interns = User.objects.filter(
            role=User.Role.INTERN,
            department__in=managed_depts
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
            dept_key = dept if dept else "Unassigned"
            interns = User.objects.filter(
                role=User.Role.INTERN,
                department=dept
            ).select_related('intern_profile')
            
            serialized_interns = []
            for intern in interns:
                profile = getattr(intern, 'intern_profile', None)
                if profile:
                    serialized_interns.append({
                        'id': intern.id,
                        'email': intern.email,
                        'full_name': intern.full_name,
                        'role': intern.role,
                        'department': intern.department,
                        'university': profile.university or '',
                        'phone_number': profile.phone_number or '',
                        'status': profile.status or 'ACTIVE',
                        'skills': profile.skills or [],
                    })
                else:
                    serialized_interns.append({
                        'id': intern.id,
                        'email': intern.email,
                        'full_name': intern.full_name,
                        'role': intern.role,
                        'department': intern.department,
                        'university': '',
                        'phone_number': '',
                        'status': 'ACTIVE',
                        'skills': [],
                    })
            
            if dept_key in result:
                result[dept_key].extend(serialized_interns)
            else:
                result[dept_key] = serialized_interns
        
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
                        'is_profile_complete': bool(profile.phone_number and profile.university)
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
                        'is_profile_complete': False
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
                    'is_profile_complete': bool(profile.phone_number and profile.university)
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

import csv
import secrets
from django.conf import settings

class BulkUploadInternsView(views.APIView):
    """API endpoint to bulk upload interns via CSV"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response({'error': 'Only Admins and Managers can bulk upload interns'}, status=status.HTTP_403_FORBIDDEN)
            
        if 'file' not in request.FILES:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
            
        file_obj = request.FILES['file']
        if not file_obj.name.endswith('.csv'):
            return Response({'error': 'Only CSV files are supported'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            decoded_file = file_obj.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded_file)
            
            created_count = 0
            errors = []
            
            for row in reader:
                email = row.get('email', '').strip()
                full_name = row.get('full_name', '').strip()
                department = row.get('department', '').strip()
                
                if not email or not full_name:
                    errors.append(f"Missing email or name for row: {row}")
                    continue
                    
                if User.objects.filter(email=email).exists():
                    errors.append(f"User with email {email} already exists")
                    continue
                    
                password = secrets.token_urlsafe(12)
                
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    full_name=full_name,
                    role=User.Role.INTERN,
                    department=department
                )
                
                InternProfile.objects.create(
                    user=user,
                    university=row.get('university', ''),
                    phone_number=row.get('phone_number', ''),
                    status='ACTIVE'
                )
                
                created_count += 1
                
                from apps.accounts.models import PasswordResetToken
                reset_token = secrets.token_urlsafe(32)
                PasswordResetToken.objects.create(user=user, token=reset_token)
                
                from apps.accounts.serializers import dispatch_email
                try:
                    dispatch_email(
                        receivers=[user.email],
                        subject=f"Welcome to {settings.SITE_NAME} - Complete Your Registration",
                        template_name='emails/registration_email.html',
                        context={
                            'full_name': user.full_name,
                            'email': user.email,
                            'reset_token': reset_token,
                            'site_url': getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
                        }
                    )
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to send email to {user.email}: {str(e)}")
                    
            return Response({
                'message': f'Successfully created {created_count} interns.',
                'errors': errors
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': f'Failed to parse file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
