from rest_framework import serializers
from .models import Feedback
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from apps.projects.models import Project, ProjectAssignment
from apps.analytics.models import TaskTracking


# Nested serializer for Project details
class ProjectSerializer(serializers.ModelSerializer):
    mentor_name = serializers.CharField(source='mentor.full_name', read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'mentor', 'mentor_name', 'repository_url', 'tech_stack', 'start_date', 'end_date']


# Nested serializer for Task details
class TaskDetailSerializer(serializers.ModelSerializer):
    intern = UserSerializer(read_only=True)
    project_name = serializers.SerializerMethodField()
    project_description = serializers.SerializerMethodField()
    mentor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskTracking
        fields = [
            'id', 'task_id', 'title', 'description', 'intern',
            'status', 'priority', 'due_date', 'assigned_at',
            'submitted_at', 'completed_at', 'estimated_hours', 'actual_hours',
            'quality_rating', 'code_review_score', 'bug_count',
            'mentor_feedback', 'rework_required',
            'project_assignment', 'project_name', 'project_description', 'mentor_name'
        ]
    
    def get_project_name(self, obj):
        if obj.project_assignment:
            return obj.project_assignment.project.name
        return None
    
    def get_project_description(self, obj):
        if obj.project_assignment:
            return obj.project_assignment.project.description
        return None
    
    def get_mentor_name(self, obj):
        if obj.project_assignment:
            mentor = obj.project_assignment.project.mentor
            return mentor.full_name if mentor else None
        return None


class FeedbackSerializer(serializers.ModelSerializer):
    reviewer = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    task = TaskDetailSerializer(read_only=True)
    
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True, required=False, allow_null=True
    )
    task_id = serializers.PrimaryKeyRelatedField(
        queryset=TaskTracking.objects.all(), source='task', write_only=True, required=False, allow_null=True
    )
    recipient_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='recipient', write_only=True
    )

    class Meta:
        model = Feedback
        fields = [
            'id', 'reviewer', 'recipient', 'project', 'task',
            'feedback_type', 'task_status', 'rating', 'comments', 
            'areas_for_improvement', 'strengths',
            'is_read', 'read_at',
            'created_at', 'updated_at',
            'project_id', 'task_id', 'recipient_id'
        ]
        read_only_fields = ['created_at', 'updated_at', 'reviewer', 'is_read', 'read_at']
