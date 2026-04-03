from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from .models import User
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash
from .permissions import IsAdmin, IsManager, IsIntern


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        user = request.user
        if 'full_name' in request.data:
            user.full_name = request.data['full_name']
        if 'department' in request.data:
            user.department = request.data['department']
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(current_password):
            return Response(
                {'current_password': ['Current password is incorrect']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, user)
        
        return Response({'message': 'Password changed successfully'})


class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"message": "Hello Admin"})


class ManagerOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        return Response({"message": "Hello Manager"})


class InternOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsIntern]

    def get(self, request):
        return Response({"message": "Hello Intern"})


class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        role_filter = request.query_params.get('role')
        department_filter = request.query_params.get('department')
        
        # Start with all users
        users = User.objects.all()
        
        # If role filter is specified, only return that role
        if role_filter:
            users = users.filter(role=role_filter)
        
        # Managers and interns can only see interns in their department
        if user.role == User.Role.MANAGER:
            if role_filter and role_filter != 'INTERN':
                # Manager requesting non-interns, return empty
                users = users.none()
            else:
                # Manager requesting interns, filter by their department
                users = users.filter(role=User.Role.INTERN, department=user.department)
        
        if user.role == User.Role.INTERN:
            # Interns can only see other interns in their department
            if role_filter and role_filter != 'INTERN':
                users = users.none()
            else:
                users = users.filter(role=User.Role.INTERN, department=user.department)
        
        # If department filter is specified (for admins)
        if department_filter and user.role == User.Role.ADMIN:
            users = users.filter(department=department_filter)
        
        # Exclude the current user from the list
        users = users.exclude(id=user.id)
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
