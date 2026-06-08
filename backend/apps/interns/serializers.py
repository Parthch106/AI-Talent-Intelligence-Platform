from rest_framework import serializers
from .models import InternProfile
from apps.accounts.serializers import UserSerializer

class InternProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = InternProfile
        fields = '__all__'
