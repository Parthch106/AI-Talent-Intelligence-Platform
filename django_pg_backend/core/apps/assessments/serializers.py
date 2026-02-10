from rest_framework import serializers
from .models import Assessment, AssessmentSubmission
from apps.accounts.serializers import UserSerializer

class AssessmentSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Assessment
        fields = '__all__'

class AssessmentSubmissionSerializer(serializers.ModelSerializer):
    intern = UserSerializer(read_only=True)
    assessment = AssessmentSerializer(read_only=True)
    
    assessment_id = serializers.PrimaryKeyRelatedField(
        queryset=Assessment.objects.all(), source='assessment', write_only=True
    )

    class Meta:
        model = AssessmentSubmission
        fields = '__all__'
