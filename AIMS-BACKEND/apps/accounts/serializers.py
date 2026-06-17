from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, InternProfile, FullTimeOffer, StipendRecord
from apps.analytics.models import ConversionScore


def dispatch_email(receivers, subject, template_name, context):
    import socket
    # Check if Redis is running on localhost:6379 with 0.1s timeout
    redis_running = False
    try:
        s = socket.create_connection(("127.0.0.1", 6379), timeout=0.1)
        s.close()
        redis_running = True
    except Exception:
        pass

    if redis_running:
        try:
            from .tasks import send_email_async
            send_email_async.delay(
                receivers=receivers,
                subject=subject,
                template_name=template_name,
                context=context
            )
            return
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Celery queueing failed, falling back to sync: {str(e)}")

    # Sync fallback
    from django.template.loader import render_to_string
    from core.settings import EMAIL_SENDER
    html_content = render_to_string(template_name, context)
    EMAIL_SENDER.send(
        receivers=receivers,
        subject=subject,
        html=html_content
    )


class UserSerializer(serializers.ModelSerializer):
    is_profile_complete = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "department", "can_create_project", "can_assign_tasks", "is_profile_complete", "email_notifications_enabled"]

    def get_is_profile_complete(self, obj):
        if obj.role == User.Role.INTERN:
            from apps.interns.models import InternProfile
            try:
                profile = InternProfile.objects.get(user=obj)
                return bool(profile.phone_number and profile.university and profile.gpa and profile.graduation_year and profile.skills)
            except InternProfile.DoesNotExist:
                return False
        return True


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "full_name", "password", "role"]

    def create(self, validated_data):
        # Force role to INTERN for public registration
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            role=User.Role.INTERN,
            department="",  # Only Admin can set department
        )
        # Send registration confirmation email
        from django.conf import settings
        try:
            dispatch_email(
                receivers=[user.email],
                subject=f"Welcome to {settings.SITE_NAME} - Registration Confirmed",
                template_name='emails/registration_email.html',
                context={
                    'full_name': user.full_name,
                    'email': user.email,
                    'password': validated_data["password"],
                    'site_url': getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
                }
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send registration confirmation email: {str(e)}")
            
        return user


class StaffRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "full_name", "password", "role", "department", "can_create_project", "can_assign_tasks"]

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
        # Apply granular permissions
        user.can_create_project = validated_data.get("can_create_project", True)
        user.can_assign_tasks = validated_data.get("can_assign_tasks", True)
        user.save()
        # Send registration confirmation email
        from django.conf import settings
        try:
            dispatch_email(
                receivers=[user.email],
                subject=f"Welcome to {settings.SITE_NAME} - Account Created",
                template_name='emails/registration_email.html',
                context={
                    'full_name': user.full_name,
                    'email': user.email,
                    'password': validated_data["password"],
                    'site_url': getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
                }
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send staff registration confirmation email: {str(e)}")
            
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    otp_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        user = authenticate(
            email=data["email"],
            password=data["password"]
        )

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        from django.conf import settings
        import os
        
        # Respect BYPASS_LOGIN_OTP env override if present, otherwise default to settings.DEBUG
        bypass_otp_env = os.getenv('BYPASS_LOGIN_OTP')
        if bypass_otp_env is not None:
            bypass_otp = bypass_otp_env == 'True'
        else:
            bypass_otp = settings.DEBUG

        if bypass_otp:

            # Determine if profile is complete (only for interns)
            is_profile_complete = True
            if user.role == User.Role.INTERN:
                from apps.interns.models import InternProfile
                try:
                    profile = InternProfile.objects.get(user=user)
                    is_profile_complete = bool(profile.phone_number and profile.university and profile.gpa and profile.graduation_year and profile.skills)
                except InternProfile.DoesNotExist:
                    is_profile_complete = False

            refresh = RefreshToken.for_user(user)
            request = self.context.get('request')
            if request:
                from apps.accounts.authentication import generate_client_fingerprint
                refresh['client_fingerprint'] = generate_client_fingerprint(request)

            return {
                "otp_required": False,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "department": user.department,
                    "can_create_project": user.can_create_project,
                    "can_assign_tasks": user.can_assign_tasks,
                    "is_profile_complete": is_profile_complete,
                },
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }

        otp_code = data.get("otp_code")

        import random
        import string
        from django.utils import timezone
        from apps.accounts.models import VerificationOTP
        from django.template.loader import render_to_string
        from core.settings import EMAIL_SENDER
        from django.conf import settings

        if not otp_code:
            # Step 1: Generate and send OTP for Login
            code = ''.join(random.choices(string.digits, k=6))
            expires_at = timezone.now() + timezone.timedelta(minutes=10)
            
            # Delete any unverified LOGIN OTPs for this user to avoid spam
            VerificationOTP.objects.filter(user=user, purpose='LOGIN', is_verified=False).delete()
            
            VerificationOTP.objects.create(
                user=user,
                email=user.email,
                otp_code=code,
                purpose='LOGIN',
                expires_at=expires_at
            )

            # Send Email (Asynchronous queue or sync fallback)
            try:
                dispatch_email(
                    receivers=[user.email],
                    subject=f"Login Verification OTP - {settings.SITE_NAME}",
                    template_name='emails/login_otp_email.html',
                    context={
                        'otp_code': code
                    }
                )
            except Exception as e:
                raise serializers.ValidationError(f"Failed to send verification OTP email: {str(e)}")

            return {
                "otp_required": True,
                "email": user.email
            }
        else:
            # Step 2: Verify OTP
            otp_record = VerificationOTP.objects.filter(
                user=user,
                email=user.email,
                otp_code=otp_code,
                purpose='LOGIN',
                is_verified=False
            ).first()

            if not otp_record or otp_record.is_expired():
                raise serializers.ValidationError("Invalid or expired login verification code")

            # Mark as verified
            otp_record.is_verified = True
            otp_record.save()

            # Login verification complete, prepare session

            # Determine if profile is complete (only for interns)
            is_profile_complete = True
            if user.role == User.Role.INTERN:
                from apps.interns.models import InternProfile
                try:
                    profile = InternProfile.objects.get(user=user)
                    is_profile_complete = bool(profile.phone_number and profile.university and profile.gpa and profile.graduation_year and profile.skills)
                except InternProfile.DoesNotExist:
                    is_profile_complete = False

            refresh = RefreshToken.for_user(user)
            request = self.context.get('request')
            if request:
                from apps.accounts.authentication import generate_client_fingerprint
                refresh['client_fingerprint'] = generate_client_fingerprint(request)

            return {
                "otp_required": False,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "department": user.department,
                    "can_create_project": user.can_create_project,
                    "can_assign_tasks": user.can_assign_tasks,
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


# ============================================================================
# Auth Expansion: Password Reset & OTP Serializers
# ============================================================================

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)


class PasswordResetConfirmSerializer(serializers.Serializer):
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)


