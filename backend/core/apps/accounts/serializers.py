from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, InternProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "department"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "full_name", "password", "role", "department"]

    def create(self, validated_data):
        # Force role to INTERN for public registration
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            role=User.Role.INTERN,
            department=validated_data.get("department", ""),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            email=data["email"],
            password=data["password"]
        )

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        # Determine if profile is complete (only for interns)
        is_profile_complete = True
        if user.role == User.Role.INTERN:
            from apps.interns.models import InternProfile
            try:
                profile = InternProfile.objects.get(user=user)
                # Profile is complete if phone and university are set
                is_profile_complete = bool(profile.phone_number and profile.university)
            except InternProfile.DoesNotExist:
                is_profile_complete = False

        refresh = RefreshToken.for_user(user)

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "department": user.department,
                "is_profile_complete": is_profile_complete,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


# ============================================================================
# V2 — InternProfile Serializers
# ============================================================================

class InternProfileSerializer(serializers.ModelSerializer):
    """Full serializer for reading/writing an intern's V2 career profile."""
    user_email      = serializers.EmailField(source='user.email',     read_only=True)
    user_full_name  = serializers.CharField(source='user.full_name',  read_only=True)
    user_department = serializers.CharField(source='user.department', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    manager_name    = serializers.CharField(
        source='assigned_manager.full_name',
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model  = InternProfile
        fields = [
            'id', 'user', 'user_email', 'user_full_name', 'user_department',
            'status', 'status_display',
            'join_date', 'expected_end_date', 'actual_end_date',
            'assigned_manager', 'manager_name',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InternProfileListSerializer(serializers.ModelSerializer):
    """Compact serializer for manager/admin dashboards — one row per intern."""
    user_email     = serializers.EmailField(source='user.email',    read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = InternProfile
        fields = [
            'id', 'user', 'user_email', 'user_full_name',
            'status', 'status_display',
            'join_date', 'expected_end_date',
        ]
