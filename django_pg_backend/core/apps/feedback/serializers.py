from rest_framework import serializers
from .models import Feedback
from apps.accounts.serializers import UserSerializer
from apps.projects.models import Project

class FeedbackSerializer(serializers.ModelSerializer):
    reviewer = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    project = serializers.PrimaryKeyRelatedField(read_only=True)  # Or represent properly
    
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True, required=False, allow_null=True
    )
    recipient_id = serializers.PrimaryKeyRelatedField(
        queryset=UserSerializer.Meta.model.objects.filter(role='INTERN'), source='recipient', write_only=True
    )

    class Meta:
        model = Feedback
        fields = '__all__'
