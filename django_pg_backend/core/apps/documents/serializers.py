from rest_framework import serializers
from .models import Document
from apps.accounts.serializers import UserSerializer

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Document
        fields = '__all__'
