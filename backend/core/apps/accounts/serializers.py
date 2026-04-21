from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, InternProfile, FullTimeOffer, StipendRecord
from apps.analytics.models import ConversionScore


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


class StaffRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "full_name", "password", "role", "department"]

    def create(self, validated_data):
        # Allow any role passed from the staff portal
        role = validated_data.get("role", User.Role.MANAGER)
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            role=role,
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


# ============================================================================
# Phase 5 — Full-Time Offers & Stipends
# ============================================================================

class FullTimeOfferSerializer(serializers.ModelSerializer):
    intern_name      = serializers.CharField(source='intern.full_name', read_only=True)
    intern_email     = serializers.EmailField(source='intern.email', read_only=True)
    issued_by_name   = serializers.CharField(source='issued_by.full_name', read_only=True, allow_null=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    composite_score  = serializers.FloatField(source='conversion_score.composite_score', read_only=True)

    class Meta:
        model = FullTimeOffer
        fields = [
            'id', 'intern', 'intern_name', 'intern_email',
            'conversion_score', 'composite_score',
            'issued_by', 'issued_by_name', 'issued_at',
            'status', 'status_display',
            'recommended_role_title', 'recommended_department',
            'salary_band_min', 'salary_band_max',
            'ai_onboarding_plan', 'ai_offer_summary',
            'response_deadline', 'intern_response_at', 'intern_response_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'issued_at', 'ai_onboarding_plan', 'ai_offer_summary', 'created_at']


class StipendRecordSerializer(serializers.ModelSerializer):
    intern_name    = serializers.CharField(source='intern.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = StipendRecord
        fields = [
            'id', 'intern', 'intern_name', 'month', 'amount',
            'status', 'status_display',
            'approved_by', 'approved_by_name', 'approved_at',
            'disbursed_at', 'notes', 'performance_score_at_disbursement'
        ]
        read_only_fields = ['id', 'approved_at', 'disbursed_at']


