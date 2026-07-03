from rest_framework import serializers
from .models import Feedback, TaskComment
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from apps.projects.models import Project, ProjectAssignment
from apps.analytics.models import TaskTracking
from apps.documents.serializers import DocumentSerializer


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
    comments_count = serializers.SerializerMethodField()
    evidences_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskTracking
        fields = [
            'id', 'task_id', 'title', 'description', 'intern',
            'status', 'priority', 'due_date', 'assigned_at',
            'submitted_at', 'completed_at', 'estimated_hours', 'actual_hours',
            'quality_rating', 'code_review_score', 'bug_count',
            'mentor_feedback', 'rework_required',
            'project_assignment', 'project_name', 'project_description', 'mentor_name',
            'comments_count', 'evidences_count'
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

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_evidences_count(self, obj):
        return obj.comments.values('evidences').exclude(evidences__isnull=True).distinct().count()


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
    parent_feedback_id = serializers.PrimaryKeyRelatedField(
        queryset=Feedback.objects.all(), source='parent_feedback', write_only=True, required=False, allow_null=True
    )
    
    replies = serializers.SerializerMethodField()
    evidences_details = serializers.SerializerMethodField()
    evidence_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
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
            'project_id', 'task_id', 'recipient_id',
            'parent_feedback', 'parent_feedback_id', 'replies', 'evidences', 'evidences_details', 'evidence_ids'
        ]
        read_only_fields = ['created_at', 'updated_at', 'reviewer', 'is_read', 'read_at', 'parent_feedback', 'replies', 'evidences_details']

    def create(self, validated_data):
        evidence_ids = validated_data.pop('evidence_ids', [])
        feedback = super().create(validated_data)
        if evidence_ids:
            feedback.evidences.set(evidence_ids)
        return feedback

    def get_replies(self, obj):
        # Prevent infinite recursion by not fetching nested replies
        replies = obj.replies.all()
        request = self.context.get('request')
        return [
            {
                'id': reply.id,
                'reviewer': UserSerializer(reply.reviewer).data,
                'comments': reply.comments,
                'created_at': reply.created_at,
                'evidences_details': [
                    {
                        'id': ev.id,
                        'title': ev.title,
                        'document_type': ev.document_type,
                        'url': request.build_absolute_uri(ev.file.url) if request and ev.file else (ev.file.url if ev.file else None)
                    } for ev in reply.evidences.all()
                ]
            } for reply in replies
        ]

    def get_evidences_details(self, obj):
        request = self.context.get('request')
        return [
            {
                'id': ev.id,
                'title': ev.title,
                'document_type': ev.document_type,
                'url': request.build_absolute_uri(ev.file.url) if request and ev.file else (ev.file.url if ev.file else None)
            } for ev in obj.evidences.all()
        ]


class TaskCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    evidences_details = serializers.SerializerMethodField()
    evidence_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    replies = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'author', 'content', 'parent', 'created_at', 'updated_at', 
            'evidence_ids', 'evidences_details', 'replies'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def create(self, validated_data):
        evidence_ids = validated_data.pop('evidence_ids', [])
        comment = super().create(validated_data)
        if evidence_ids:
            comment.evidences.set(evidence_ids)
        return comment

    def get_evidences_details(self, obj):
        request = self.context.get('request')
        return [
            {
                'id': ev.id,
                'title': ev.title,
                'document_type': ev.document_type,
                'url': request.build_absolute_uri(ev.file.url) if request and ev.file else (ev.file.url if ev.file else None)
            } for ev in obj.evidences.all()
        ]

    def get_replies(self, obj):
        replies = obj.replies.all()
        return TaskCommentSerializer(replies, many=True, context=self.context).data
