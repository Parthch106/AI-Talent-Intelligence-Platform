from rest_framework import serializers
from .models import Document, ResumeData
from apps.accounts.serializers import UserSerializer

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Document
        fields = '__all__'


class ResumeDataSerializer(serializers.ModelSerializer):
    """
    Serializer for ResumeData model.
    Handles the structured parsed data from resumes.
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ResumeData
        fields = [
            'id',
            'document',
            'user',
            'name',
            'email',
            'phone',
            'skills',
            'education',
            'experience',
            'projects',
            'certifications',
            'tools',
            'total_experience_years',
            'parsed_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'document', 'user', 'parsed_at', 'updated_at']
