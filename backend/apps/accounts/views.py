from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    RegisterSerializer, StaffRegisterSerializer, LoginSerializer, UserSerializer,
    PasswordResetRequestSerializer, OTPVerifySerializer, PasswordResetConfirmSerializer
)
from .models import User, VerificationOTP, PasswordResetToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import update_session_auth_hash
from .permissions import IsAdmin, IsManager, IsIntern
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
import random
import string
import secrets
import requests




class DepartmentListView(APIView):
    """
    GET /api/accounts/departments/
    
    Returns a list of unique departments currently in the system.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        departments = User.objects.exclude(department='').values_list('department', flat=True).distinct()
        return Response({'departments': sorted(list(departments))}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StaffRegisterView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request):
        serializer = StaffRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Staff user registered successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            user = User.objects.filter(email=email).first()
            if user:
                # Generate 6-digit OTP
                otp_code = ''.join(random.choices(string.digits, k=6))
                expires_at = timezone.now() + timezone.timedelta(minutes=10)
                
                VerificationOTP.objects.create(
                    user=user,
                    email=email,
                    otp_code=otp_code,
                    purpose='RESET',
                    expires_at=expires_at
                )
                
                # Render and Send Email
                try:
                    from django.template.loader import render_to_string
                    from core.settings import EMAIL_SENDER
                    
                    html_content = render_to_string('emails/otp_email.html', {
                        'otp_code': otp_code,
                        'user': user
                    })
                    
                    EMAIL_SENDER.send(
                        receivers=[email],
                        subject=f"Password Reset OTP - {settings.SITE_NAME}",
                        html=html_content
                    )
                except Exception as e:
                    print(f"Email Error: {str(e)}")
                    return Response(
                        {"error": "Failed to send OTP. Please check email configuration."}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
                
            return Response({"message": "If an account exists with this email, an OTP has been sent."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetVerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp_code = serializer.validated_data['otp_code']
            
            otp = VerificationOTP.objects.filter(
                email=email, 
                otp_code=otp_code, 
                purpose='RESET',
                is_verified=False
            ).first()
            
            if otp and not otp.is_expired():
                otp.is_verified = True
                otp.save()
                
                # Generate Reset Token
                reset_token = secrets.token_urlsafe(32)
                PasswordResetToken.objects.create(user=otp.user, token=reset_token)
                
                return Response({"reset_token": reset_token}, status=status.HTTP_200_OK)
            
            return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['reset_token']
            new_password = serializer.validated_data['new_password']
            
            reset_token_obj = PasswordResetToken.objects.filter(token=token, is_used=False).first()
            if reset_token_obj and reset_token_obj.is_valid():
                user = reset_token_obj.user
                user.set_password(new_password)
                user.save()
                
                reset_token_obj.is_used = True
                reset_token_obj.save()
                
                return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)
            
            return Response({"error": "Invalid or expired reset token"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        user = request.user
        if 'full_name' in request.data:
            user.full_name = request.data['full_name']
        if 'department' in request.data:
            if user.role == 'ADMIN':
                user.department = request.data['department']
            else:
                # Silently ignore or you could return an error. 
                # Given the user context, better to return an error if they tried to change it.
                if user.department != request.data['department']:
                    return Response({'error': 'Only administrators can change departments.'}, status=status.HTTP_403_FORBIDDEN)
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(current_password):
            return Response(
                {'current_password': ['Current password is incorrect']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, user)
        
        return Response({'message': 'Password changed successfully'})


class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"message": "Hello Admin"})


class ManagerOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        return Response({"message": "Hello Manager"})


class InternOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsIntern]

    def get(self, request):
        return Response({"message": "Hello Intern"})


class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        role_filter = request.query_params.get('role')
        department_filter = request.query_params.get('department')
        
        # Start with all users
        users = User.objects.all()
        
        # If role filter is specified, only return that role
        if role_filter:
            users = users.filter(role=role_filter)
        
        # Managers and interns can only see interns in their department
        if user.role == User.Role.MANAGER:
            if role_filter and role_filter != 'INTERN':
                # Manager requesting non-interns, return empty
                users = users.none()
            else:
                # Manager requesting interns, filter by their department
                users = users.filter(role=User.Role.INTERN, department=user.department)
        
        if user.role == User.Role.INTERN:
            # Interns can only see other interns in their department
            if role_filter and role_filter != 'INTERN':
                users = users.none()
            else:
                users = users.filter(role=User.Role.INTERN, department=user.department)
        
        # If department filter is specified (for admins)
        if department_filter and user.role == User.Role.ADMIN:
            users = users.filter(department=department_filter)
        
        # Exclude the current user from the list
        users = users.exclude(id=user.id)
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class InternOffboardView(APIView):
    """
    POST /api/admin/interns/{id}/offboard/
    Cleanly closes all V2 records when an intern leaves mid-phase.
    Admin only.
    """
    permission_classes = [IsAdmin]

    def post(self, request, intern_id):
        from django.utils import timezone
        from apps.accounts.models import InternProfile, EmploymentStage, FullTimeOffer, StipendRecord

        reason = request.data.get('reason', 'Contract ended')

        try:
            intern = User.objects.get(pk=intern_id, role='INTERN')
        except User.DoesNotExist:
            return Response({'detail': 'Intern not found.'}, status=404)

        # 1. Update InternProfile status → FORMER
        InternProfile.objects.filter(user=intern).update(
            status='FORMER',
        )

        # 2. Close all open EmploymentStage records (phase_end_date = today)
        open_stages = EmploymentStage.objects.filter(
            intern=intern,
            phase_end_date__isnull=True
        )
        open_stages.update(phase_end_date=timezone.now().date())

        # 3. Log the offboarding reason
        InternProfile.objects.filter(user=intern).update(
            notes=f"[OFFBOARDING — {timezone.now().date()}] {reason}"
        )

        # 4. Revoke any DRAFT FullTimeOffers
        FullTimeOffer.objects.filter(intern=intern, status='DRAFT').update(status='EXPIRED')

        # 5. Cancel PENDING stipend records
        StipendRecord.objects.filter(intern=intern, status='PENDING').update(
            status='HELD',
            notes=f'Auto-held: intern offboarded on {timezone.now().date()} — {reason}'
        )

        # 6. In-app notification to admin
        _notify_offboarding_complete(intern, reason, request.user)

        return Response({
            'detail': f'{intern.email} successfully offboarded.',
            'stages_closed': open_stages.count(),
            'status': 'FORMER',
        })


def _notify_offboarding_complete(intern, reason, actioned_by):
    try:
        from apps.notifications.models import Notification
        for admin in User.objects.filter(role='ADMIN'):
            Notification.objects.create(
                recipient  = admin,
                message    = (
                    f"Intern {intern.get_full_name()} has been offboarded "
                    f"by {actioned_by.full_name or actioned_by.email}. Reason: {reason}"
                ),
                notif_type = 'OFFBOARDING',
            )
    except Exception:
        pass


# ============================================================================
# Phase 5 — Stipend Management
# ============================================================================

import csv
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import StipendRecord
from .serializers import StipendRecordSerializer


class StipendRecordViewSet(viewsets.ModelViewSet):
    """
    Admin: /api/admin/stipend/
    Intern: /api/stipend/ (own records)
    """
    serializer_class = StipendRecordSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'INTERN':
            return StipendRecord.objects.filter(intern=user)
        
        queryset = StipendRecord.objects.all().select_related('intern', 'approved_by')
        if user.role == 'MANAGER' and user.department:
            queryset = queryset.filter(intern__department=user.department)
        return queryset

    @action(detail=True, methods=['patch'], url_path='approve')
    def approve(self, request, pk=None):
        from django.utils import timezone
        record = self.get_object()
        if record.status != 'PENDING':
            return Response({'detail': f'Cannot approve record with status {record.status}.'}, status=400)
        
        record.status      = 'APPROVED'
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.save()
        return Response(StipendRecordSerializer(record).data)

    @action(detail=True, methods=['patch'], url_path='disburse')
    def disburse(self, request, pk=None):
        from django.utils import timezone
        record = self.get_object()
        if record.status != 'APPROVED':
            return Response({'detail': 'Only approved records can be disbursed.'}, status=400)
        
        record.status       = 'DISBURSED'
        record.disbursed_at = timezone.now()
        # Snapshot current performance score if possible
        try:
            from apps.analytics.models import ConversionScore
            cs = ConversionScore.objects.get(intern=record.intern)
            record.performance_score_at_disbursement = cs.composite_score
        except Exception:
            pass
            
        record.save()
        return Response(StipendRecordSerializer(record).data)

    @action(detail=False, methods=['get'], url_path='export')
    def export_payroll_csv(self, request):
        """
        GET /api/admin/stipend/export/
        Returns a CSV of all APPROVED stipends for the current payroll cycle.
        """
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payroll_export.csv"'

        writer = csv.writer(response)
        writer.writerow(['Intern Name', 'Email', 'Month', 'Amount', 'Status', 'Notes'])

        records = StipendRecord.objects.filter(status='APPROVED').select_related('intern')
        for r in records:
            writer.writerow([
                r.intern.full_name,
                r.intern.email,
                r.month.strftime('%B %Y'),
                r.amount,
                r.status,
                r.notes
            ])

        return response
