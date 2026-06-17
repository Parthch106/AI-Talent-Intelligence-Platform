from rest_framework import serializers
from .models import Project, ProjectAssignment, ProjectModule
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer

class ProjectModuleSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), 
        source='project', 
        write_only=True,
        required=False
    )
    
    class Meta:
        model = ProjectModule
        fields = ['id', 'project', 'project_id', 'name', 'description', 'order', 'created_at', 'updated_at']

class ProjectSerializer(serializers.ModelSerializer):
    mentor = UserSerializer(read_only=True)
    modules = ProjectModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = '__all__'

class ProjectAssignmentSerializer(serializers.ModelSerializer):
    intern = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True
    )
    intern_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.INTERN), source='intern', write_only=True
    )

    class Meta:
        model = ProjectAssignment
        fields = ['id', 'project', 'intern', 'role', 'assigned_at', 'status', 'project_id', 'intern_id']
