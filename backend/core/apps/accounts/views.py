from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, StaffRegisterSerializer, LoginSerializer, UserSerializer
from .models import User
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash
from .permissions import IsAdmin, IsManager, IsIntern


class RegisterView(APIView):
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
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


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
            user.department = request.data['department']
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
        if self.action == 'list' and self.request.user.role == 'INTERN':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'INTERN':
            return StipendRecord.objects.filter(intern=user)
        return StipendRecord.objects.all().select_related('intern', 'approved_by')

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
