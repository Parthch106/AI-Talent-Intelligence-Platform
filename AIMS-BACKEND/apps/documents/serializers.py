from rest_framework import serializers
from .models import Document, ResumeData
from apps.accounts.serializers import UserSerializer

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    associated_context = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = '__all__'

    def get_associated_context(self, obj):
        # Inspect reverse relationships
        feedback = obj.feedback_evidences.first()
        if feedback:
            return {
                "context_type": "FEEDBACK",
                "linked_title": f"Feedback for {feedback.recipient.full_name}",
                "comment_snippet": feedback.comments[:100] if feedback.comments else "",
                "rating": feedback.rating,
                "task_id": feedback.task.task_id if feedback.task else None
            }
            
        # Inspect task comment reverse relation (created later)
        if hasattr(obj, 'task_comment_evidences'):
            task_comment = obj.task_comment_evidences.first()
            if task_comment:
                return {
                    "context_type": "TASK_COMMENT",
                    "linked_title": f"Task: {task_comment.task.title}",
                    "comment_snippet": task_comment.content[:100] if task_comment.content else "",
                    "rating": None,
                    "task_id": task_comment.task.task_id
                }
        return None


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
