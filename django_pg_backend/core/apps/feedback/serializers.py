from rest_framework import serializers
from .models import Feedback
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from apps.projects.models import Project


class FeedbackSerializer(serializers.ModelSerializer):
    reviewer = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True, required=False, allow_null=True
    )
    recipient_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='recipient', write_only=True
    )

    class Meta:
        model = Feedback
        fields = [
            'id', 'reviewer', 'recipient', 'project', 
            'feedback_type', 'rating', 'comments', 
            'areas_for_improvement', 'strengths',
            'created_at', 'updated_at',
            'project_id', 'recipient_id'
        ]
        read_only_fields = ['created_at', 'updated_at', 'reviewer']
