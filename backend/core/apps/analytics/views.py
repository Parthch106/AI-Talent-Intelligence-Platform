import re
import uuid
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q, Avg, Count
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from apps.interns.models import InternProfile
from apps.projects.models import Project, ProjectAssignment
from apps.accounts.models import User
from apps.feedback.models import Feedback
from apps.analytics.services import AnalyticsDashboardService
from apps.analytics.services.internship_monitoring_service import InternshipMonitoringService
from apps.analytics.models import (
    TaskTracking,
    AttendanceRecord,
    WeeklyReport,
    PerformanceMetrics,
    MonthlyEvaluationReport,
    Application,
    ModelPrediction,
)
from apps.analytics.services.weekly_report_parser import parse_weekly_report
from apps.notifications.signals import (
    notify_task_assigned, 
    notify_task_submitted, 
    notify_task_evaluated
)


def validate_manager_access(user, target_intern_id):
    """
    Helper function to validate that a manager can access a specific intern.
    Managers can only access interns in their department.
    Admins can access any intern.
    Returns (is_valid, error_response)
    """
    if user.role == User.Role.ADMIN:
        return True, None
    
    if user.role == User.Role.MANAGER:
        try:
            target_intern = User.objects.get(id=target_intern_id, role=User.Role.INTERN)
            if target_intern.department != user.department:
                return False, Response(
                    {'error': 'You can only view interns in your department'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except User.DoesNotExist:
            return False, Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return True, None


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        data = {}

        if str(user.role) == str(User.Role.ADMIN):
            data['total_managers'] = User.objects.filter(role=User.Role.ADMIN).count()
            data['total_interns'] = User.objects.filter(role=User.Role.INTERN).count()
            data['total_projects'] = Project.objects.count()
            data['active_projects'] = Project.objects.filter(status='IN_PROGRESS').count()
            data['role'] = 'ADMIN'
            
        elif str(user.role) == str(User.Role.MANAGER):
            # My Interns (assigned to my projects)
            try:
                my_interns_count = InternProfile.objects.filter(user__assigned_projects__project__mentor=user).distinct().count()
                data['total_interns'] = my_interns_count
            except Exception as e:
                data['total_interns'] = 0
            
            # My Projects
            my_projects = Project.objects.filter(mentor=user)
            data['total_projects'] = my_projects.count()
            data['active_projects'] = my_projects.filter(status='IN_PROGRESS').count()
            
            # Pending Reviews - Count tasks submitted by interns in manager's department
            # that haven't been reviewed yet
            try:
                # Check if manager has a department
                if not user.department:
                    data['pending_reviews'] = 0
                else:
                    # Get interns in manager's department
                    department_interns = User.objects.filter(
                        role=User.Role.INTERN,
                        department=user.department
                    )
                    
                    # Count submitted tasks awaiting review
                    pending_tasks = TaskTracking.objects.filter(
                        intern__in=department_interns,
                        status='SUBMITTED'
                    ).count()
                    
                    data['pending_reviews'] = pending_tasks
            except Exception as e:
                logger.warning(f"Error calculating pending reviews: {e}")
                data['pending_reviews'] = 0
            
            data['role'] = 'MANAGER'

        elif str(user.role) == str(User.Role.INTERN):
            # My Project Assignments
            try:
                my_assignments = ProjectAssignment.objects.filter(intern=user)
                data['assigned_projects'] = my_assignments.count()
                data['completed_projects'] = my_assignments.filter(status='COMPLETED').count()
                data['active_projects'] = my_assignments.filter(status='ACTIVE').count()
            except Exception as e:
                data['assigned_projects'] = 0
                data['completed_projects'] = 0
                data['active_projects'] = 0
            
            # My Tasks - get from TaskTracking
            try:
                my_tasks = TaskTracking.objects.filter(intern=user)
                data['total_tasks'] = my_tasks.count()
                data['completed_tasks'] = my_tasks.filter(status='COMPLETED').count()
                data['pending_tasks'] = my_tasks.filter(status__in=['ASSIGNED', 'IN_PROGRESS']).count()
            except Exception as e:
                data['total_tasks'] = 0
                data['completed_tasks'] = 0
                data['pending_tasks'] = 0
            
            # My Feedback score - get from Feedback model (use recipient, rating)
            try:
                feedbacks = Feedback.objects.filter(recipient=user)
                if feedbacks.exists():
                    avg_score = feedbacks.aggregate(Avg('rating'))['rating__avg']
                    data['average_score'] = round(avg_score, 1) if avg_score else "N/A"
                else:
                    data['average_score'] = "N/A"
            except Exception as e:
                data['average_score'] = "N/A"
            
            # My AI Readiness score - from ModelPrediction (V2)
            try:
                application = Application.objects.filter(intern=user).first()
                if application:
                    prediction = ModelPrediction.objects.filter(application=application).first()
                    if prediction:
                        data['ai_readiness_score'] = round(prediction.suitability_score * 100, 1) if prediction.suitability_score else 0
                    else:
                        data['ai_readiness_score'] = 0
                else:
                    data['ai_readiness_score'] = 0
            except Exception:
                data['ai_readiness_score'] = 0
            
            data['role'] = 'INTERN'

        return Response(data)


class InternIntelligenceView(APIView):
    """
    API endpoint for intern intelligence data.
    Computes and returns AI-readiness scores and metrics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get intelligence data for the current user or specified intern.
        """
        user = request.user
        intern_id = request.query_params.get('intern_id')
        
        analytics_service = AnalyticsDashboardService()
        
        # If intern_id provided and user is manager/admin
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
        else:
            target_id = user.id
        
        intelligence = analytics_service.get_intern_analytics(target_id)
        
        return Response(intelligence)


class ComputeIntelligenceView(APIView):
    """
    API endpoint to trigger intelligence computation for an intern.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, intern_id=None):
        """
        Compute intelligence for specified intern.
        """
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        target_id = intern_id or request.data.get('intern_id')
        
        if not target_id:
            return Response(
                {'error': 'intern_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        analytics_service = AnalyticsDashboardService()
        result = analytics_service.compute_intern_intelligence(int(target_id))
        
        if result:
            return Response({
                'message': 'Intelligence computed successfully',
                'data': result
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to compute intelligence'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ManagerDashboardView(APIView):
    """
    API endpoint for manager dashboard metrics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get dashboard metrics for manager's department.
        """
        user = request.user
        
        if user.role != User.Role.MANAGER:
            return Response(
                {'error': 'Only managers can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        analytics_service = AnalyticsDashboardService()
        dashboard = analytics_service.get_manager_dashboard(user.id)
        
        return Response(dashboard)


class AdminDashboardView(APIView):
    """
    API endpoint for admin/HR dashboard metrics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get platform-wide analytics dashboard.
        """
        user = request.user
        
        if user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Only admins can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        analytics_service = AnalyticsDashboardService()
        dashboard = analytics_service.get_admin_dashboard()
        
        return Response(dashboard)


class SkillGapAnalysisView(APIView):
    """
    API endpoint for skill gap analysis.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get skill gap analysis for interns.
        """
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from django.db.models import Count, Avg
        from apps.analytics.models import StructuredFeature
        
        # V2: Use StructuredFeature for skill gap analysis
        interns = User.objects.filter(role='INTERN')
        features_qs = StructuredFeature.objects.filter(
            application__intern__in=interns
        )
        
        # Aggregate skill gap counts
        avg_metrics = features_qs.aggregate(
            avg_skill_match=Avg('skill_match_ratio'),
            avg_domain_similarity=Avg('domain_similarity_score'),
            total_critical_gaps=Count('id', filter=Q(critical_skill_gap_count__gt=0)),
        )
        
        # Get interns with most critical skill gaps
        high_gap_features = features_qs.filter(
            critical_skill_gap_count__gt=0
        ).order_by('-critical_skill_gap_count')[:15]
        
        gap_details = [
            {
                'intern': f.application.intern.email,
                'critical_skill_gap_count': f.critical_skill_gap_count,
                'skill_match_ratio': round(f.skill_match_ratio, 2),
            }
            for f in high_gap_features
        ]
        
        return Response({
            'avg_skill_match_ratio': round(avg_metrics['avg_skill_match'] or 0, 2),
            'avg_domain_similarity': round(avg_metrics['avg_domain_similarity'] or 0, 2),
            'interns_with_critical_gaps': avg_metrics['total_critical_gaps'],
            'gap_details': gap_details,
            'total_interns_analyzed': features_qs.count(),
        })


# ============================================================================
# PHASE 2 - PART 2: During Internship Monitoring Views
# ============================================================================


class TaskTrackingView(APIView):
    """
    API endpoint for task tracking during internship.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get task tracking data for an intern."""
        user = request.user
        intern_id = request.query_params.get('intern_id')
        status_filter = request.query_params.get('status')

        # Determine target intern
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
            # Validate manager access to intern
            is_valid, error_response = validate_manager_access(user, target_id)
            if not is_valid:
                return error_response
        else:
            target_id = user.id

        # Get tasks
        tasks = TaskTracking.objects.filter(intern_id=target_id)

        if status_filter:
            tasks = tasks.filter(status=status_filter)

        data = [{
            'id': task.id,
            'task_id': task.task_id,
            'title': task.title,
            'description': task.description,
            'status': task.status,
            'priority': task.priority,
            'assigned_at': task.assigned_at,
            'due_date': task.due_date,
            'submitted_at': task.submitted_at,
            'completed_at': task.completed_at,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'quality_rating': task.quality_rating,
            'code_review_score': task.code_review_score,
            'project': {
                'id': task.project_assignment.id,
                'name': task.project_assignment.project.name,
                'status': task.project_assignment.status,
            } if task.project_assignment else None,
            'module': {
                'id': task.project_module.id,
                'name': task.project_module.name,
            } if task.project_module else None,
        } for task in tasks]

        return Response({'tasks': data})

    def post(self, request):
        """Create a new task tracking entry."""
        user = request.user

        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        task_data = request.data
        intern_id = task_data.get('intern_id')

        if not intern_id:
            return Response(
                {'error': 'intern_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Auto-generate task_id if not provided
        task_id = task_data.get('task_id')
        if not task_id:
            task_id = f"TASK-{intern.id}-{uuid.uuid4().hex[:8].upper()}"

        task = TaskTracking.objects.create(
            intern=intern,
            task_id=task_id,
            title=task_data.get('title'),
            description=task_data.get('description', ''),
            status=task_data.get('status', 'ASSIGNED'),
            priority=task_data.get('priority', 'MEDIUM'),
            due_date=task_data.get('due_date'),
            estimated_hours=task_data.get('estimated_hours', 0.0),
            project_assignment_id=task_data.get('project_assignment_id'),
            project_module_id=task_data.get('project_module_id'),
            skills_required=task_data.get('skills_required', []),
        )

        # Notify Intern
        notify_task_assigned(intern, task, user)

        return Response({
            'message': 'Task created successfully',
            'task_id': task.id
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, task_id=None):
        """Update task status."""
        user = request.user
        
        if not task_id:
            task_id = request.data.get('task_id')
        
        if not task_id:
            return Response(
                {'error': 'task_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            task = TaskTracking.objects.get(id=task_id)
        except TaskTracking.DoesNotExist:
            return Response(
                {'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate status transitions
        valid_statuses = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'COMPLETED', 'REWORK', 'BLOCKED']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Permission check:
        # - Manager/Admin can update to any status including BLOCKED
        # - Intern can only update to IN_PROGRESS, SUBMITTED, or COMPLETED
        if user.role == User.Role.INTERN:
            if new_status not in ['IN_PROGRESS', 'SUBMITTED', 'COMPLETED']:
                return Response(
                    {'error': 'Interns can only update task status to IN_PROGRESS, SUBMITTED, or COMPLETED'},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Intern can only update their own tasks
            if task.intern_id != user.id:
                return Response(
                    {'error': 'You can only update your own tasks'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Managers can only update tasks for interns in their department
        if user.role == User.Role.MANAGER:
            target_intern = User.objects.get(id=task.intern_id)
            if target_intern.department != user.department:
                return Response(
                    {'error': 'You can only update tasks for interns in your department'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Update task status
        old_status = task.status
        task.status = new_status
        
        # Set submitted_at when task is submitted
        if new_status == 'SUBMITTED' and not task.submitted_at:
            task.submitted_at = timezone.now()
        
        # Set actual_hours when task is submitted (from request data)
        actual_hours = request.data.get('actual_hours')
        if actual_hours is not None and new_status in ['SUBMITTED', 'COMPLETED']:
            task.actual_hours = float(actual_hours)
        
        # Set completed_at if status is COMPLETED
        if new_status == 'COMPLETED' and not task.completed_at:
            task.completed_at = timezone.now()
            # If actual_hours not provided, calculate from assigned_at to completed_at
            if not task.actual_hours:
                time_diff = task.completed_at - task.assigned_at
                task.actual_hours = round(time_diff.total_seconds() / 3600, 2)
        
        task.save()
        
        # Trigger Notifications
        if new_status == 'SUBMITTED':
            notify_task_submitted(task, task.intern)
        
        return Response({
            'message': 'Task status updated successfully',
            'task_id': task.id,
            'old_status': old_status,
            'new_status': new_status,
            'submitted_at': task.submitted_at,
            'completed_at': task.completed_at,
            'actual_hours': task.actual_hours
        })


class TaskEvaluationView(APIView):
    """
    API endpoint for managers to evaluate intern tasks.
    Allows managers to rate task quality, provide feedback, and mark for rework.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id=None):
        """Get task evaluation details."""
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied. Only managers and admins can view task evaluations.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not task_id:
            task_id = request.query_params.get('task_id')
        
        if not task_id:
            return Response(
                {'error': 'task_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            task = TaskTracking.objects.select_related('intern').get(id=task_id)
        except TaskTracking.DoesNotExist:
            return Response(
                {'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate manager access to intern's department
        if user.role == User.Role.MANAGER:
            is_valid, error_response = validate_manager_access(user, task.intern_id)
            if not is_valid:
                return error_response
        
        return Response({
            'task_id': task.id,
            'task_number': task.task_id,
            'title': task.title,
            'intern': {
                'id': task.intern.id,
                'name': f"{task.intern.first_name} {task.intern.last_name}",
                'email': task.intern.email
            },
            'status': task.status,
            'priority': task.priority,
            'assigned_at': task.assigned_at,
            'due_date': task.due_date,
            'submitted_at': task.submitted_at,
            'completed_at': task.completed_at,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'evaluation': {
                'quality_rating': task.quality_rating,
                'code_review_score': task.code_review_score,
                'bug_count': task.bug_count,
                'mentor_feedback': task.mentor_feedback,
                'rework_required': task.rework_required
            }
        })

    def patch(self, request, task_id=None):
        """Update task evaluation (for managers to submit evaluation)."""
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied. Only managers and admins can evaluate tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not task_id:
            task_id = request.data.get('task_id')
        
        if not task_id:
            return Response(
                {'error': 'task_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            task = TaskTracking.objects.get(id=task_id)
        except TaskTracking.DoesNotExist:
            return Response(
                {'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate manager access to intern's department
        if user.role == User.Role.MANAGER:
            is_valid, error_response = validate_manager_access(user, task.intern_id)
            if not is_valid:
                return error_response
        
        # Update evaluation fields
        quality_rating = request.data.get('quality_rating')
        if quality_rating is not None:
            quality_rating = float(quality_rating)
            if not (0 <= quality_rating <= 5):
                return Response(
                    {'error': 'quality_rating must be between 0 and 5'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            task.quality_rating = quality_rating
        
        code_review_score = request.data.get('code_review_score')
        if code_review_score is not None:
            code_review_score = float(code_review_score)
            if not (0 <= code_review_score <= 100):
                return Response(
                    {'error': 'code_review_score must be between 0 and 100'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            task.code_review_score = code_review_score
        
        bug_count = request.data.get('bug_count')
        if bug_count is not None:
            try:
                task.bug_count = int(bug_count)
            except ValueError:
                return Response(
                    {'error': 'bug_count must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        mentor_feedback = request.data.get('mentor_feedback')
        if mentor_feedback is not None:
            task.mentor_feedback = mentor_feedback
        
        rework_required = request.data.get('rework_required')
        if rework_required is not None:
            task.rework_required = bool(rework_required)
            # If rework is required, change status to REWORK
            if task.rework_required and task.status == 'COMPLETED':
                task.status = 'REWORK'
        
        # Update status if provided
        new_status = request.data.get('status')
        if new_status:
            if new_status in ['REVIEWED', 'COMPLETED', 'REWORK']:
                task.status = new_status
                if new_status == 'COMPLETED' and not task.completed_at:
                    task.completed_at = timezone.now()
        
        task.save()
        
        # Trigger Notifications for Intern
        if new_status in ['COMPLETED', 'REWORK']:
            notify_task_evaluated(task, task.intern, user, new_status)
        
        return Response({
            'message': 'Task evaluation updated successfully',
            'task_id': task.id,
            'evaluation': {
                'quality_rating': task.quality_rating,
                'code_review_score': task.code_review_score,
                'bug_count': task.bug_count,
                'mentor_feedback': task.mentor_feedback,
                'rework_required': task.rework_required
            },
            'status': task.status
        })


class AttendanceRecordView(APIView):
    """
    API endpoint for attendance tracking.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get attendance records for an intern."""
        user = request.user
        intern_id = request.query_params.get('intern_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status = request.query_params.get('status')
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 15))
        
        logger.info(f"AttendanceRecordView.get: user_id={user.id} role={user.role} intern_id_param='{intern_id}'")

        # Determine target intern
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
            logger.info(f"  Manager/Admin viewing intern_id={target_id}")
            # Validate manager access to intern
            is_valid, error_response = validate_manager_access(user, target_id)
            if not is_valid:
                logger.warning(f"  Access denied for target_id={target_id}")
                return error_response
        else:
            target_id = user.id
            logger.info(f"  Intern viewing own records (id={target_id})")

        # Get attendance
        attendance = AttendanceRecord.objects.filter(intern_id=target_id)
        total_records = attendance.count()

        if start_date:
            attendance = attendance.filter(date__gte=start_date)
        if end_date:
            attendance = attendance.filter(date__lte=end_date)

        # Filter by date
        if start_date:
            attendance = attendance.filter(date__gte=start_date)
        if end_date:
            attendance = attendance.filter(date__lte=end_date)

        # Get overall stats for the period (before status filter) - for the cards
        overall_stats = {
            'present': attendance.filter(status='PRESENT').count(),
            'absent': attendance.filter(status='ABSENT').count(),
            'late': attendance.filter(status__in=['LATE', 'HALF_DAY']).count(),
            'wfh': attendance.filter(status='WORK_FROM_HOME').count(),
            'total': attendance.count()
        }
        
        # Filter by status if provided
        if status:
            # Handle multiple statuses (comma-separated like 'LATE,HALF_DAY')
            status_list = [s.strip() for s in status.split(',')]
            if len(status_list) > 1:
                attendance = attendance.filter(status__in=status_list)
            else:
                attendance = attendance.filter(status=status)

        # Get total filtered records for pagination
        filtered_total = attendance.count()
        
        # Use overall stats for cards (always show period stats, not filtered)
        stats = overall_stats
        
        # Apply pagination
        offset = (page - 1) * limit
        paginated_attendance = attendance[offset:offset + limit]
        
        data = [{
            'id': record.id,
            'date': record.date,
            'status': record.status,
            'check_in_time': record.check_in_time,
            'check_out_time': record.check_out_time,
            'working_hours': record.working_hours,
            'notes': record.notes,
        } for record in paginated_attendance]
        
        logger.info(f"  Returning {len(data)} records (page {page}, total={filtered_total})")

        return Response({
            'attendance': data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total_records': filtered_total,
                'total_pages': (filtered_total + limit - 1) // limit if filtered_total > 0 else 1
            },
            'stats': stats
        })

    def post(self, request):
        """Create or update attendance record."""
        user = request.user

        # Interns can mark their own attendance
        intern_id = request.data.get('intern_id', user.id)
        date = request.data.get('date')
        status_val = request.data.get('status', 'PRESENT')

        try:
            intern = User.objects.get(id=intern_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        attendance, created = AttendanceRecord.objects.update_or_create(
            intern=intern,
            date=date,
            defaults={
                'status': status_val,
                'check_in_time': request.data.get('check_in_time'),
                'check_out_time': request.data.get('check_out_time'),
                'working_hours': request.data.get('working_hours', 0.0),
                'notes': request.data.get('notes', ''),
            }
        )

        return Response({
            'message': 'Attendance recorded successfully',
            'id': attendance.id
        }, status=status.HTTP_201_CREATED)


class MyAttendanceView(APIView):
    """
    API endpoint for interns to view their own attendance records.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the current intern's attendance records with intern details."""
        user = request.user
        
        # Only interns can access their own attendance
        if user.role != User.Role.INTERN:
            return Response(
                {'error': 'This endpoint is only for interns'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        logger.info(f"MyAttendanceView.get: user_id={user.id} full_name='{user.full_name}'")
        
        # Get attendance records for this intern
        attendance = AttendanceRecord.objects.filter(intern=user).order_by('-date')
        count = attendance.count()
        logger.info(f"  Found {count} records")
        
        # Include intern details in response
        data = [{
            'id': record.id,
            'intern': {
                'id': record.intern.id,
                'name': record.intern.name,
                'email': record.intern.email
            },
            'date': record.date,
            'status': record.status,
            'check_in_time': record.check_in_time,
            'check_out_time': record.check_out_time,
            'working_hours': record.working_hours,
            'notes': record.notes,
        } for record in attendance]
        
        logger.info(f"  Returning {len(data)} records")
        
        return Response(data)


class WeeklyReportView(APIView):
    """
    API endpoint for weekly reports.
    """
    permission_classes = [IsAuthenticated]

    def _get_actual_task_counts(self, intern_id, start_date, end_date):
        """Helper to get actual task counts from TaskTracking for a specific week."""
        # Normalize to datetime for comparison
        # Using a small buffer for hours to include tasks on the boundary dates
        s_date = datetime.strptime(str(start_date), '%Y-%m-%d').date()
        e_date = datetime.strptime(str(end_date), '%Y-%m-%d').date()
        
        tasks = TaskTracking.objects.filter(
            intern_id=intern_id,
            assigned_at__date__lte=e_date
        ).filter(
            Q(completed_at__date__gte=s_date) | Q(completed_at__isnull=True)
        )
        
        # More precise: completed tasks must have completed_at within the range
        completed = tasks.filter(status='COMPLETED', completed_at__date__range=[s_date, e_date]).count()
        in_progress = tasks.filter(status__in=['IN_PROGRESS', 'ASSIGNED', 'SUBMITTED', 'REWORK']).count()
        blocked = tasks.filter(status='BLOCKED').count()
        
        return {
            'completed': completed,
            'in_progress': in_progress,
            'blocked': blocked
        }

    def get(self, request):
        """Get weekly reports for an intern."""
        user = request.user
        intern_id = request.query_params.get('intern_id')

        # Determine target intern
        target_id = user.id  # Default to own reports
        if intern_id:
            target_id = int(intern_id)
            # Only perform strict permission checks if requesting someone else's data
            if target_id != user.id:
                if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                    return Response(
                        {'error': 'Permission denied: Cannot access other users reports'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                # Validate manager access to intern
                is_valid, error_response = validate_manager_access(user, target_id)
                if not is_valid:
                    return error_response

        reports = WeeklyReport.objects.filter(intern_id=target_id)

        data = []
        for report in reports:
            actual = self._get_actual_task_counts(target_id, report.week_start_date, report.week_end_date)
            
            # Mismatch logic: if any count differs from DB
            mismatches = []
            if report.tasks_completed != actual['completed']:
                mismatches.append(f"Completed tasks mismatch: Reported {report.tasks_completed}, DB shows {actual['completed']}")
            if report.tasks_in_progress != actual['in_progress']:
                mismatches.append(f"In-progress tasks mismatch: Reported {report.tasks_in_progress}, DB shows {actual['in_progress']}")
            if report.tasks_blocked != actual['blocked']:
                mismatches.append(f"Blocked tasks mismatch: Reported {report.tasks_blocked}, DB shows {actual['blocked']}")
                
            data.append({
                'id': report.id,
                'week_start_date': report.week_start_date,
                'week_end_date': report.week_end_date,
                'tasks_completed': report.tasks_completed,
                'tasks_in_progress': report.tasks_in_progress,
                'tasks_blocked': report.tasks_blocked,
                'actual_tasks': actual,
                'status_mismatch': len(mismatches) > 0,
                'mismatch_details': mismatches,
                'accomplishments': report.accomplishments,
                'challenges': report.challenges,
                'learnings': report.learnings,
                'next_week_goals': report.next_week_goals,
                'self_rating': report.self_rating,
                'is_submitted': report.is_submitted,
                'submitted_at': report.submitted_at,
                'is_reviewed': report.is_reviewed,
                'pdf_url': report.pdf_report.url if report.pdf_report else None,
            })

        return Response({'weekly_reports': data})

    def post(self, request):
        """Submit a weekly report with PDF upload."""
        user = request.user
        
        # Only interns can submit weekly reports
        if user.role != User.Role.INTERN:
            return Response(
                {'error': 'Only interns can submit weekly reports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report_data = request.data
        pdf_file = report_data.get('pdf_report')

        if not pdf_file:
            return Response(
                {'error': 'PDF report is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get intern_id from form data or use current user
        intern_id = report_data.get('intern_id', user.id)

        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Parse the PDF to extract report data
        parsed_data = {}
        try:
            parsed_data = parse_weekly_report(pdf_file)
        except Exception as e:
            logger.error(f"[WeeklyReportView] Error parsing PDF for user_id={user.id}: {e}")
            # Continue without parsed data - user can fill in manually
            parsed_data = {}

        # Get week dates from form data, parsed data, or use current week
        week_start_date = report_data.get('week_start_date') or parsed_data.get('week_start_date')
        week_end_date = report_data.get('week_end_date') or parsed_data.get('week_end_date')

        # If no dates provided, use current week
        if not week_start_date or not week_end_date:
            today = timezone.now().date()
            # Calculate Monday as start of week
            start_of_week = today - timezone.timedelta(days=today.weekday())
            end_of_week = start_of_week + timezone.timedelta(days=6)
            week_start_date = week_start_date or start_of_week
            week_end_date = week_end_date or end_of_week

        # Get task data from form or parsed data
        # Note: parsed_data.tasks_completed is the text of tasks, not a count
        parsed_tasks_text = parsed_data.get('tasks_completed', '')
        
        # For parsed data, use accomplishments for task text and count tasks
        accomplishments = parsed_tasks_text or report_data.get('accomplishments', '')
        
        # Count tasks from parsed text
        if parsed_tasks_text:
            # Count numbered tasks (1., 2., etc.)
            tasks_completed = len(re.findall(r'\d+[\.\)]', parsed_tasks_text))
            # Ensure at least 0
            tasks_completed = max(tasks_completed, 0)
        else:
            tasks_completed = int(report_data.get('tasks_completed', 0))
        
        tasks_in_progress = int(report_data.get('tasks_in_progress', parsed_data.get('tasks_in_progress', 0)))
        tasks_blocked = int(report_data.get('tasks_blocked', parsed_data.get('tasks_blocked', 0)))
        challenges = report_data.get('challenges', parsed_data.get('challenges', ''))
        learnings = report_data.get('learnings', parsed_data.get('learnings', ''))
        next_week_goals = report_data.get('next_week_goals', parsed_data.get('next_week_goals', ''))
        
        # Handle self_rating safely - can be None from parsed data
        parsed_rating = parsed_data.get('self_rating')
        form_rating = report_data.get('self_rating')
        self_rating = None
        if form_rating:
            try:
                self_rating = float(form_rating)
            except (ValueError, TypeError):
                pass
        elif parsed_rating is not None:
            try:
                self_rating = float(parsed_rating)
            except (ValueError, TypeError):
                pass

        # Reset file position for saving
        if hasattr(pdf_file, 'seek'):
            pdf_file.seek(0)

        report, created = WeeklyReport.objects.update_or_create(
            intern=intern,
            week_start_date=week_start_date,
            defaults={
                'week_end_date': week_end_date,
                'pdf_report': pdf_file,
                'tasks_completed': tasks_completed,
                'tasks_in_progress': tasks_in_progress,
                'tasks_blocked': tasks_blocked,
                'accomplishments': accomplishments,
                'challenges': challenges,
                'learnings': learnings,
                'next_week_goals': next_week_goals,
                'self_rating': self_rating if self_rating and self_rating > 0 else None,
                'is_submitted': True,
                'submitted_at': timezone.now(),
            }
        )

        return Response({
            'message': 'Weekly report submitted successfully',
            'id': report.id,
            'pdf_url': report.pdf_report.url if report.pdf_report else None,
            'parsed_data': {
                'week_start_date': str(report.week_start_date),
                'week_end_date': str(report.week_end_date),
                'tasks_completed': report.tasks_completed,
                'tasks_in_progress': report.tasks_in_progress,
                'tasks_blocked': report.tasks_blocked,
                'accomplishments': report.accomplishments[:100] if report.accomplishments else '',
                'challenges': report.challenges[:100] if report.challenges else '',
                'learnings': report.learnings[:100] if report.learnings else '',
                'next_week_goals': report.next_week_goals[:100] if report.next_week_goals else '',
                'self_rating': report.self_rating,
            }
        }, status=status.HTTP_201_CREATED)


class PerformanceMetricsView(APIView):
    """
    API endpoint for performance metrics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get performance metrics for an intern."""
        user = request.user
        intern_id = request.query_params.get('intern_id')
        period_type = request.query_params.get('period_type', 'WEEKLY')

        # Determine target intern
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
            # Validate manager access to intern
            is_valid, error_response = validate_manager_access(user, target_id)
            if not is_valid:
                return error_response
        else:
            target_id = user.id

        metrics = PerformanceMetrics.objects.filter(
            intern_id=target_id,
            period_type=period_type
        ).order_by('-period_start')

        data = [{
            'id': metric.id,
            'period_start': metric.period_start,
            'period_end': metric.period_end,
            'period_type': metric.period_type,
            'overall_performance_score': metric.overall_performance_score,
            'productivity_score': metric.productivity_score,
            'quality_score': metric.quality_score,
            'engagement_score': metric.engagement_score,
            'growth_score': metric.growth_score,
            'dropout_risk': metric.dropout_risk,
            'full_time_readiness_score': metric.full_time_readiness_score,
            'promotion_probability': metric.promotion_probability,
        } for metric in metrics]

        return Response({'performance_metrics': data})


class ComputePerformanceMetricsView(APIView):
    """
    API endpoint to compute performance metrics for an intern.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Compute weekly/monthly performance metrics."""
        user = request.user

        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        intern_id = request.data.get('intern_id')
        period_type = request.data.get('period_type', 'WEEKLY')
        period_start = request.data.get('period_start')

        if not intern_id or not period_start:
            return Response(
                {'error': 'intern_id and period_start required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate manager access to intern
        is_valid, error_response = validate_manager_access(user, int(intern_id))
        if not is_valid:
            return error_response

        monitoring_service = InternshipMonitoringService()

        if period_type == 'WEEKLY':
            result = monitoring_service.compute_weekly_metrics(
                int(intern_id),
                datetime.strptime(period_start, '%Y-%m-%d'),
                datetime.strptime(period_start, '%Y-%m-%d') + timedelta(days=7)
            )
        else:
            result = monitoring_service.compute_monthly_metrics(
                int(intern_id),
                datetime.strptime(period_start, '%Y-%m-%d').replace(day=1)
            )

        if result:
            return Response({
                'message': 'Performance metrics computed successfully',
                'data': result
            })
        else:
            return Response(
                {'error': 'Failed to compute performance metrics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MonthlyEvaluationView(APIView):
    """
    API endpoint for monthly evaluation reports.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get monthly evaluation reports for an intern."""
        user = request.user
        intern_id = request.query_params.get('intern_id')

        # Determine target intern
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
            # Validate manager access to intern
            is_valid, error_response = validate_manager_access(user, target_id)
            if not is_valid:
                return error_response
        else:
            target_id = user.id

        evaluations = MonthlyEvaluationReport.objects.filter(
            intern_id=target_id
        ).order_by('-evaluation_month')

        data = [{
            'id': eval.id,
            'evaluation_month': eval.evaluation_month,
            'overall_performance_score': eval.overall_performance_score,
            'performance_grade': eval.performance_grade,
            'risk_status': eval.risk_status,
            'recommendation': eval.recommendation,
            'is_submitted': eval.is_submitted,
            'is_reviewed': eval.is_reviewed,
        } for eval in evaluations]

        return Response({'monthly_evaluations': data})


class DropoutRiskDashboardView(APIView):
    """
    API endpoint for dropout risk dashboard.
    Shows interns at risk of dropping out.
    """
    permission_classes = [User.Role.ADMIN, User.Role.MANAGER]

    def get(self, request):
        """Get dropout risk summary for all interns."""
        user = request.user

        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get interns in manager's department (for managers) or all (for admins)
        if user.role == User.Role.MANAGER:
            interns = User.objects.filter(role=User.Role.INTERN, department=user.department)
        else:
            interns = User.objects.filter(role=User.Role.INTERN)

        # Get latest performance metrics for each intern
        high_risk = []
        medium_risk = []
        low_risk = []

        for intern in interns:
            latest_metrics = PerformanceMetrics.objects.filter(
                intern=intern
            ).order_by('-period_start').first()

            if latest_metrics:
                risk_entry = {
                    'intern_id': intern.id,
                    'name': intern.full_name or intern.email,
                    'email': intern.email,
                    'dropout_risk': latest_metrics.dropout_risk,
                    'dropout_risk_score': latest_metrics.dropout_risk_score,
                    'dropout_risk_factors': latest_metrics.dropout_risk_factors,
                    'overall_score': latest_metrics.overall_performance_score,
                }

                if latest_metrics.dropout_risk == 'HIGH':
                    high_risk.append(risk_entry)
                elif latest_metrics.dropout_risk == 'MEDIUM':
                    medium_risk.append(risk_entry)
                else:
                    low_risk.append(risk_entry)

        return Response({
            'high_risk': high_risk,
            'medium_risk': medium_risk,
            'low_risk': low_risk,
            'summary': {
                'high_risk_count': len(high_risk),
                'medium_risk_count': len(medium_risk),
                'low_risk_count': len(low_risk),
                'total_interns': len(high_risk) + len(medium_risk) + len(low_risk),
            }
        })


class PPOEligibilityDashboardView(APIView):
    """
    API endpoint for PPO eligibility dashboard.
    Shows interns eligible for Pre-Placement Offers.
    """
    permission_classes = [User.Role.ADMIN, User.Role.MANAGER]

    def get(self, request):
        """Get PPO eligibility summary."""
        user = request.user

        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get interns in manager's department (for managers) or all (for admins)
        if user.role == User.Role.MANAGER:
            interns = User.objects.filter(role=User.Role.INTERN, department=user.department)
        else:
            interns = User.objects.filter(role=User.Role.INTERN)

        eligible = []
        potential = []

        for intern in interns:
            latest_metrics = PerformanceMetrics.objects.filter(
                intern=intern
            ).order_by('-period_start').first()

            if latest_metrics and latest_metrics.promotion_probability >= 70:
                entry = {
                    'intern_id': intern.id,
                    'name': intern.full_name or intern.email,
                    'email': intern.email,
                    'overall_score': latest_metrics.overall_performance_score,
                    'productivity_score': latest_metrics.productivity_score,
                    'quality_score': latest_metrics.quality_score,
                    'engagement_score': latest_metrics.engagement_score,
                    'growth_score': latest_metrics.growth_score,
                    'promotion_probability': latest_metrics.promotion_probability,
                    'recommendation': latest_metrics.recommended_actions if hasattr(latest_metrics, 'recommended_actions') else [],
                }

                if latest_metrics.promotion_probability >= 80:
                    eligible.append(entry)
                else:
                    potential.append(entry)

        return Response({
            'eligible': eligible,
            'potential': potential,
            'summary': {
                'eligible_count': len(eligible),
                'potential_count': len(potential),
            }
        })


# ============================================================================
# HEATMAP VISUALIZATION ENDPOINTS
# ============================================================================

class TaskHeatmapView(APIView):
    """
    API endpoint for GitHub-style task contribution heatmap.
    Returns daily task completion counts for heatmap visualization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get task completion data for heatmap visualization."""
        user = request.user
        intern_id = request.query_params.get('intern_id')
        months = int(request.query_params.get('months', 12))  # Default last 12 months

        # Determine target intern
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
            # Validate manager access
            if user.role == User.Role.MANAGER:
                is_valid, error_response = validate_manager_access(user, target_id)
                if not is_valid:
                    return error_response
        else:
            target_id = user.id

        # Calculate date range
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            end_date = timezone.now().date()
            start_date = end_date - relativedelta(months=months)

        # Get completed tasks in date range
        completed_tasks = TaskTracking.objects.filter(
            intern_id=target_id,
            status='COMPLETED',
            completed_at__date__gte=start_date,
            completed_at__date__lte=end_date
        ).values('completed_at__date').annotate(
            count=Count('id')
        )

        # Get in-progress tasks in date range (based on assigned_at)
        in_progress_tasks = TaskTracking.objects.filter(
            intern_id=target_id,
            status__in=['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REWORK'],
            assigned_at__date__gte=start_date,
            assigned_at__date__lte=end_date
        ).values('assigned_at__date').annotate(
            count=Count('id')
        )

        # Create heatmap data by merging counts
        heatmap_data = {}
        for task in completed_tasks:
            date_str = task['completed_at__date'].strftime('%Y-%m-%d')
            heatmap_data[date_str] = heatmap_data.get(date_str, 0) + task['count']
            
        for task in in_progress_tasks:
            date_str = task['assigned_at__date'].strftime('%Y-%m-%d')
            heatmap_data[date_str] = heatmap_data.get(date_str, 0) + task['count']

        # Get quality ratings for each day
        tasks_with_quality = TaskTracking.objects.filter(
            intern_id=target_id,
            status='COMPLETED',
            completed_at__date__gte=start_date,
            completed_at__date__lte=end_date,
            quality_rating__isnull=False
        ).values('completed_at__date').annotate(
            avg_quality=Avg('quality_rating')
        )

        quality_data = {}
        for task in tasks_with_quality:
            date_str = task['completed_at__date'].strftime('%Y-%m-%d')
            quality_data[date_str] = round(task['avg_quality'], 1)

        return Response({
            'heatmap': heatmap_data,
            'quality': quality_data,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        })


class AttendanceHeatmapView(APIView):
    """
    API endpoint for monthly attendance heatmap visualization.
    Returns daily attendance status for heatmap visualization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get attendance data for heatmap visualization."""
        user = request.user
        intern_id = request.query_params.get('intern_id')
        months = int(request.query_params.get('months', 12))
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        # Determine target intern
        if intern_id:
            if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            target_id = int(intern_id)
            if user.role == User.Role.MANAGER:
                is_valid, error_response = validate_manager_access(user, target_id)
                if not is_valid:
                    return error_response
        else:
            target_id = user.id

        # Calculate date range
        if start_date_param and end_date_param:
            # Use provided date range
            start_date = timezone.datetime.strptime(start_date_param, '%Y-%m-%d').date()
            end_date = timezone.datetime.strptime(end_date_param, '%Y-%m-%d').date()
        else:
            # Default to last N months
            end_date = timezone.now().date()
            start_date = end_date - relativedelta(months=months)

        # Get attendance records
        attendance = AttendanceRecord.objects.filter(
            intern_id=target_id,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')

        # Create heatmap data with status mapping
        STATUS_VALUE_MAP = {
            'PRESENT': 4,       # Full contribution
            'WORK_FROM_HOME': 3,
            'LATE': 2,
            'HALF_DAY': 1,
            'ABSENT': 0,
        }

        heatmap_data = {}
        for record in attendance:
            date_str = record.date.strftime('%Y-%m-%d')
            heatmap_data[date_str] = {
                'status': record.status,
                'value': STATUS_VALUE_MAP.get(record.status, 0),
                'hours': record.working_hours,
            }

        # Calculate monthly summary
        monthly_summary = {}
        for record in attendance:
            month_key = record.date.strftime('%Y-%m')
            if month_key not in monthly_summary:
                monthly_summary[month_key] = {
                    'present': 0,
                    'absent': 0,
                    'late': 0,
                    'half_day': 0,
                    'wfh': 0,
                    'total_days': 0,
                }
            
            monthly_summary[month_key]['total_days'] += 1
            if record.status == 'PRESENT':
                monthly_summary[month_key]['present'] += 1
            elif record.status == 'ABSENT':
                monthly_summary[month_key]['absent'] += 1
            elif record.status == 'LATE':
                monthly_summary[month_key]['late'] += 1
            elif record.status == 'HALF_DAY':
                monthly_summary[month_key]['half_day'] += 1
            elif record.status == 'WORK_FROM_HOME':
                monthly_summary[month_key]['wfh'] += 1

        # Calculate attendance percentage for each month
        for month_key, data in monthly_summary.items():
            if data['total_days'] > 0:
                data['attendance_percentage'] = round(
                    (data['present'] + data['wfh'] + 0.5 * data['half_day']) / data['total_days'] * 100, 1
                )
            else:
                data['attendance_percentage'] = 0

        return Response({
            'heatmap': heatmap_data,
            'monthly_summary': monthly_summary,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        })


# ============================================================================
# RL DYNAMIC TASK ASSIGNMENT & LEARNING PATH API VIEWS
# ============================================================================


class RLAssignTaskView(APIView):
    """
    POST /api/analytics/rl/assign-task/

    Returns an RL-powered task difficulty recommendation for an intern.
    Managers/Admins trigger this; the result is a recommendation, not a direct assignment.
    Uses epsilon-greedy exploration - results may vary on each call.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response({'error': 'Only managers and admins can request task recommendations.'},
                            status=status.HTTP_403_FORBIDDEN)

        intern_id = request.data.get('intern_id')
        if not intern_id:
            return Response({'error': 'intern_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            intern = User.objects.get(id=int(intern_id), role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response({'error': 'Intern not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_valid, err = validate_manager_access(user, intern.id)
        if not is_valid:
            return err

        try:
            from apps.analytics.services.rl_task_assigner import assign_task_recommendation
            result = assign_task_recommendation(intern.id)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"RLAssignTaskView error: {e}")
            return Response({'error': 'Failed to generate recommendation.', 'detail': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RLTopTasksView(APIView):
    """
    POST /api/analytics/rl/top-tasks/

    Returns the top 3 RL-powered task recommendations using greedy policy.
    Results are deterministic and consistent - will return the same recommendations
    for the same intern state (no exploration/randomness).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response({'error': 'Only managers and admins can request task recommendations.'},
                            status=status.HTTP_403_FORBIDDEN)

        intern_id = request.data.get('intern_id')
        if not intern_id:
            return Response({'error': 'intern_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            intern = User.objects.get(id=int(intern_id), role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response({'error': 'Intern not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_valid, err = validate_manager_access(user, intern.id)
        if not is_valid:
            return err

        try:
            from apps.analytics.services.rl_task_assigner import assign_task_recommendation_greedy
            result = assign_task_recommendation_greedy(intern.id)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"RLTopTasksView error: {e}")
            return Response({'error': 'Failed to generate recommendations.', 'detail': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RLOptimalDifficultyView(APIView):
    """
    GET /api/analytics/rl/optimal-difficulty/<intern_id>/

    Returns the current optimal task difficulty level (1-5) for an intern,
    based on the RL agent's Q-table (greedy policy, no exploration).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, intern_id):
        user = request.user

        # Interns can check their own; managers/admins can check any
        if user.role == User.Role.INTERN and user.id != intern_id:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == User.Role.MANAGER:
            is_valid, err = validate_manager_access(user, intern_id)
            if not is_valid:
                return err

        try:
            from apps.analytics.services.rl_task_assigner import get_optimal_difficulty, get_state
            optimal = get_optimal_difficulty(intern_id)
            state_vector = get_state(intern_id)

            DIFFICULTY_LABELS = {1: 'Easy', 2: 'Easy-Medium', 3: 'Moderate', 4: 'Hard', 5: 'Very Hard'}

            return Response({
                'intern_id': intern_id,
                'optimal_difficulty': optimal,
                'difficulty_label': DIFFICULTY_LABELS.get(optimal, 'Moderate'),
                'state_vector': state_vector,
                'state_keys': [
                    'avg_quality', 'completion_rate', 'growth_velocity',
                    'avg_difficulty_handled', 'days_in_internship_norm',
                    'skill_count_norm', 'avg_skill_mastery',
                    'engagement_score_norm', 'retention_score'
                ],
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"RLOptimalDifficultyView error: {e}")
            return Response({'error': 'Failed to compute difficulty.', 'detail': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LearningPathView(APIView):
    """
    POST /api/analytics/learning-path/<intern_id>/   → Generate & save learning path
    GET  /api/analytics/learning-path/<intern_id>/   → Get current learning path
    """
    permission_classes = [IsAuthenticated]

    def _check_access(self, request_user, intern_id):
        """Returns (ok, error_response)"""
        if request_user.role == User.Role.INTERN:
            if request_user.id != intern_id:
                return False, Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        elif request_user.role == User.Role.MANAGER:
            return validate_manager_access(request_user, intern_id)
        return True, None

    def post(self, request, intern_id):
        """Generate and persist a new learning path."""
        ok, err = self._check_access(request.user, intern_id)
        if not ok:
            return err

        try:
            User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response({'error': 'Intern not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_role = request.data.get('target_role', '')
        if not target_role:
            # Try to infer from existing applications
            try:
                from apps.analytics.models import Application
                app = Application.objects.filter(intern_id=intern_id).order_by('-created_at').first()
                if app:
                    target_role = app.job_role.role_title
            except Exception:
                pass

        if not target_role:
            return Response({'error': 'target_role is required (or intern must have an application).'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.analytics.services.learning_path_optimizer import generate_and_save_path, generate_custom_skill_path
            
            # Check if this is a custom skill-based path
            path_type = request.data.get('type', 'role')
            if path_type == 'skill':
                skills = request.data.get('skills', [])
                title = request.data.get('title', 'Custom Skill Path')
                basics_only = request.data.get('basics_only', False)
                if not skills:
                    return Response({'error': 'skills list is required for skill-type paths.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                result = generate_custom_skill_path(intern_id, skills, title, basics_only=basics_only)
            else:
                result = generate_and_save_path(intern_id, target_role)
                
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"LearningPathView.post error: {e}")
            # Check if it's a database table issue
            if 'relation' in str(e) and 'does not exist' in str(e):
                return Response({
                    'error': 'Learning Path system not fully configured.',
                    'detail': 'Required database tables are missing. Please contact administrator.',
                    'required_tables': ['analytics_skillprofile', 'analytics_tasktemplate', 'analytics_learningpath', 'analytics_rlexperiencebuffer']
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({'error': 'Failed to generate learning path.', 'detail': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, intern_id):
        """Get the intern's current learning path."""
        ok, err = self._check_access(request.user, intern_id)
        if not ok:
            return err

        try:
            from apps.analytics.services.learning_path_optimizer import get_path_progress
            data = get_path_progress(intern_id)
            if data is None:
                return Response({'message': 'No learning path generated yet. Use POST to generate one.'},
                                status=status.HTTP_404_NOT_FOUND)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"LearningPathView.get error: {e}")
            # Check if it's a database table issue
            if 'relation' in str(e) and 'does not exist' in str(e):
                return Response({
                    'error': 'Learning Path system not fully configured.',
                    'detail': 'Required database tables are missing.',
                    'message': 'Please contact administrator to set up the RL system.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({'error': 'Failed to retrieve learning path.', 'detail': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LearningPathProgressView(APIView):
    """
    GET  /api/analytics/learning-path/<intern_id>/progress/  → Next milestone + full progress
    POST /api/analytics/learning-path/<intern_id>/progress/  → Update skill mastery / advance pointer
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, intern_id):
        user = request.user
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response({'error': 'Permission denied. Only managers and admins can view learning path progress.'}, 
                            status=status.HTTP_403_FORBIDDEN)

        try:
            from apps.analytics.services.learning_path_optimizer import recommend_next_milestone, get_path_progress
            progress = get_path_progress(intern_id)
            if progress is None:
                return Response({'message': 'No learning path found.'}, status=status.HTTP_404_NOT_FOUND)

            next_ms = recommend_next_milestone(intern_id)
            progress['next_milestone'] = next_ms
            return Response(progress, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"LearningPathProgressView.get error: {e}")
            if 'relation' in str(e) and 'does not exist' in str(e):
                return Response({
                    'error': 'Learning Path system not fully configured.',
                    'detail': 'Required database tables are missing.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, intern_id):
        """Update skill mastery → may advance learning path pointer."""
        user = request.user
        if user.role == User.Role.INTERN and user.id != intern_id:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        skill_id = request.data.get('skill_id')
        mastery = request.data.get('mastery')

        if not skill_id or mastery is None:
            return Response({'error': 'skill_id and mastery (0.0-1.0) are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            mastery = float(mastery)
            if not (0.0 <= mastery <= 1.0):
                return Response({'error': 'mastery must be between 0.0 and 1.0.'},
                                status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'mastery must be a float.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.analytics.services.learning_path_optimizer import update_progress, get_path_progress
            update_progress(intern_id, skill_id, mastery)
            progress = get_path_progress(intern_id)
            return Response({
                'message': f"Mastery for '{skill_id}' updated to {mastery}.",
                'progress': progress,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"LearningPathProgressView.post error: {e}")
            if 'relation' in str(e) and 'does not exist' in str(e):
                return Response({
                    'error': 'Learning Path system not fully configured.',
                    'detail': 'Required database tables are missing.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Performance Evaluation Output Layer
# ============================================================================

class PerformanceEvaluationView(APIView):
    """
    POST /api/analytics/performance/evaluate/
    
    Evaluates intern performance and returns:
    1. Performance Status (Thriving / Coping / Struggling / High Risk)
    2. Diagnosis based on weak metrics
    3. AI Suggestions for Improvement
    4. Personalized Learning Path
    
    This is the main output layer for the RL system.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Only managers and admins can evaluate intern performance.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        intern_id = request.data.get('intern_id')
        target_role = request.data.get('target_role')  # Optional
        
        if not intern_id:
            return Response(
                {'error': 'intern_id is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            intern = User.objects.get(id=int(intern_id), role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check access
        if user.role == User.Role.MANAGER:
            is_valid, err = validate_manager_access(user, intern.id)
            if not is_valid:
                return err
        
        all_time = request.data.get('all_time', False)
        if isinstance(all_time, str):
            all_time = all_time.lower() == 'true'
            
        try:
            from apps.analytics.services.performance_evaluator import evaluate_intern_performance
            result = evaluate_intern_performance(intern.id, target_role, all_time=all_time)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"PerformanceEvaluationView error: {e}")
            return Response(
                {'error': 'Failed to evaluate performance.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerformanceStatusView(APIView):
    """
    GET /api/analytics/performance/status/<intern_id>/
    
    Quick performance status check - returns status and score only.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, intern_id):
        user = request.user
        
        # Interns can check their own; managers/admins can check any
        if user.role == User.Role.INTERN and user.id != intern_id:
            return Response(
                {'error': 'Permission denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == User.Role.MANAGER:
            is_valid, err = validate_manager_access(user, intern_id)
            if not is_valid:
                return err
        
        all_time = request.query_params.get('all_time', 'false').lower() == 'true'
        
        try:
            from apps.analytics.services.performance_evaluator import get_performance_status
            result = get_performance_status(intern_id, all_time=all_time)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"PerformanceStatusView error: {e}")
            return Response(
                {'error': 'Failed to get performance status.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerformanceSuggestionsView(APIView):
    """
    GET /api/analytics/performance/suggestions/<intern_id>/
    
    Returns diagnosis and improvement suggestions for an intern.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, intern_id):
        user = request.user
        
        if user.role == User.Role.INTERN and user.id != intern_id:
            return Response(
                {'error': 'Permission denied.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == User.Role.MANAGER:
            is_valid, err = validate_manager_access(user, intern_id)
            if not is_valid:
                return err
        
        all_time = request.query_params.get('all_time', 'false').lower() == 'true'
        
        try:
            from apps.analytics.services.performance_evaluator import get_improvement_suggestions
            result = get_improvement_suggestions(intern_id, all_time=all_time)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"PerformanceSuggestionsView error: {e}")
            return Response(
                {'error': 'Failed to get suggestions.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerformanceDashboardView(APIView):
    """
    GET /api/analytics/performance/dashboard/<intern_id>/
    
    Returns a complete performance dashboard with all metrics,
    status, diagnosis, suggestions, and learning path.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, intern_id):
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied. Only managers and admins can access the performance dashboard.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == User.Role.MANAGER:
            is_valid, err = validate_manager_access(user, intern_id)
            if not is_valid:
                return err
        
        target_role = request.query_params.get('target_role')
        all_time = request.query_params.get('all_time', 'false').lower() == 'true'
        
        try:
            from apps.analytics.services.performance_evaluator import evaluate_intern_performance
            result = evaluate_intern_performance(intern_id, target_role, all_time=all_time)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"PerformanceDashboardView error: {e}")
            return Response(
                {'error': 'Failed to get dashboard data.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# LLM Task Generator - AI-Powered Task Suggestions
# ============================================================================

class LLMTaskSuggestionView(APIView):
    """
    POST /api/analytics/llm/generate-tasks/
    
    Generate AI-powered task suggestions for an intern based on their:
    - Current skills
    - Completed tasks
    - Ongoing tasks
    - Project requirements
    - Target role
    
    The manager can review the suggestions before assigning them.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Only managers and admins can generate task suggestions
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Only managers and admins can generate task suggestions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        intern_id = request.data.get('intern_id')
        module_id = request.data.get('module_id')
        task_context = request.data.get('task_context')
        num_suggestions = request.data.get('num_suggestions', 3)
        
        if not intern_id:
            return Response(
                {'error': 'intern_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get intern info
            try:
                intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Intern not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get intern's skills from ResumeSkill through Application
            from apps.analytics.models import ResumeSkill
            skills = list(ResumeSkill.objects.filter(
                application__intern_id=intern_id
            ).values_list('name', flat=True))
            
            # Get completed tasks
            from apps.analytics.models import TaskTracking
            completed_tasks = list(TaskTracking.objects.filter(
                intern_id=intern_id,
                status='COMPLETED'
            ).values(
                'title', 'description', 'status', 
                'quality_rating', 'completed_at'
            ))
            
            # Get ongoing tasks
            ongoing_tasks = list(TaskTracking.objects.filter(
                intern_id=intern_id,
                status__in=['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED']
            ).values(
                'title', 'description', 'status', 'due_date'
            ))
            
            # Get module info if provided
            module_name = None
            module_description = None
            if module_id:
                from apps.projects.models import ProjectModule
                try:
                    module = ProjectModule.objects.get(id=module_id)
                    module_name = module.name
                    module_description = module.description
                except ProjectModule.DoesNotExist:
                    pass
            
            # Generate task suggestions using LLM
            from apps.analytics.services.llm_task_generator import get_task_generator
            generator = get_task_generator()
            
            result = generator.generate_task_suggestions(
                intern_name=intern.full_name or intern.email,
                intern_skills=skills,
                completed_tasks=completed_tasks,
                ongoing_tasks=ongoing_tasks,
                module_name=module_name,
                module_description=module_description,
                task_context=task_context,
                num_suggestions=num_suggestions
            )
            
            if 'error' in result:
                return Response(
                    {'error': result.get('error', 'Failed to generate tasks')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'intern_id': intern_id,
                'intern_name': intern.full_name or intern.email,
                'tasks': result.get('tasks', []),
                'summary': result.get('summary', ''),
                'completed_tasks': completed_tasks,
                'ongoing_tasks': ongoing_tasks,
                'message': f'Generated {len(result.get("tasks", []))} task suggestions'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"LLMTaskSuggestionView error: {e}")
            return Response(
                {'error': 'Failed to generate task suggestions.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LLMTaskReviewView(APIView):
    """
    POST /api/analytics/llm/review-task/
    
    Review a task before assignment. The manager can modify the task
    and get AI feedback on whether it's appropriate for the intern.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Only managers and admins can review tasks.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        intern_id = request.data.get('intern_id')
        task_data = request.data.get('task')
        
        if not intern_id or not task_data:
            return Response(
                {'error': 'intern_id and task are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get intern's skills through Application
            from apps.analytics.models import ResumeSkill
            skills = list(ResumeSkill.objects.filter(
                application__intern_id=intern_id
            ).values_list('name', flat=True))
            
            # Get intern name
            intern = User.objects.get(id=intern_id)
            
            # Review the task using LLM
            from apps.analytics.services.llm_task_generator import get_task_generator
            generator = get_task_generator()
            
            result = generator.review_task(
                task_data=task_data,
                intern_name=intern.full_name or intern.email,
                intern_skills=skills
            )
            
            return Response({
                'review': result,
                'task': task_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"LLMTaskReviewView error: {e}")
            return Response(
                {'error': 'Failed to review task.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LLMLearningPathSuggestionView(APIView):
    """
    POST /api/analytics/llm/suggest-path/
    
    Suggest a set of skills and a rationale for an intern's learning path
    based on their goal and current skill profile.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Only managers and admins can request path suggestions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        intern_id = request.data.get('intern_id')
        goal = request.data.get('goal', 'Improve general technical skills')
        
        if not intern_id:
            return Response({'error': 'intern_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
            
            # Get current skills
            from apps.analytics.models import SkillProfile
            intern_skills = list(SkillProfile.objects.filter(
                intern_id=intern_id
            ).values_list('skill_name', flat=True))
            
            # Get available skills from optimizer graph
            from apps.analytics.services.learning_path_optimizer import PREREQUISITE_GRAPH
            available_skills = list(PREREQUISITE_GRAPH.keys())
            
            # Generate suggestions
            basics_only = request.data.get('basics_only', False)
            from apps.analytics.services.llm_learning_path_generator import get_learning_path_generator
            generator = get_learning_path_generator()
            
            result = generator.suggest_skills_from_goal(
                intern_name=intern.full_name or intern.email,
                intern_skills=intern_skills,
                goal_text=goal,
                available_skills=available_skills,
                basics_only=basics_only
            )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({'error': 'Intern not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"LLMLearningPathSuggestionView error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SkillListView(APIView):
    """
    GET /api/analytics/skills/
    
    Returns a list of skills. If intern_id is provided, returns skills for that intern.
    Otherwise, returns all available skills in the system.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            intern_id = request.query_params.get('intern_id')
            if intern_id:
                from .models import SkillProfile
                skills = SkillProfile.objects.filter(intern_id=intern_id).values_list('skill_name', flat=True).distinct()
                skills = sorted(list(skills))
            else:
                from apps.analytics.services.learning_path_optimizer import PREREQUISITE_GRAPH
                skills = sorted(list(PREREQUISITE_GRAPH.keys()))
                
            return Response({'skills': skills}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LLMMilestoneTaskView(APIView):
    """
    POST /api/analytics/learning-path/generate-milestone-task/
    
    Generates an AI-powered practical task and script for a specific milestone.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        intern_id = request.data.get('intern_id')
        milestone_index = request.data.get('milestone_index')
        skill = request.data.get('skill')
        goal = request.data.get('goal', 'Technical mastery')
        basics_only = request.data.get('basics_only', False)

        if intern_id is None or milestone_index is None or not skill:
            return Response({'error': 'intern_id, milestone_index, and skill are required.'}, 
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            intern = User.objects.get(id=intern_id)
            from apps.analytics.services.llm_learning_path_generator import get_learning_path_generator
            generator = get_learning_path_generator()
            
            task_data = generator.generate_milestone_task(
                skill=skill,
                intern_name=intern.full_name or intern.email,
                goal_text=goal,
                basics_only=basics_only
            )
            
            if 'error' in task_data:
                return Response(task_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            # Save to path
            from apps.analytics.services.learning_path_optimizer import save_milestone_task
            saved = save_milestone_task(intern_id, int(milestone_index), task_data)
            
            return Response({
                'task': task_data,
                'saved': saved
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"LLMMilestoneTaskView error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReviewMilestoneTaskView(APIView):
    """
    POST /api/analytics/learning-path/review-milestone-task/
    
    Manager approves or rejects/edits the generated milestone task.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        intern_id = request.data.get('intern_id')
        milestone_index = request.data.get('milestone_index')
        action = request.data.get('action') # 'APPROVE', 'REJECT'

        if intern_id is None or milestone_index is None or not action:
            return Response({'error': 'intern_id, milestone_index, and action are required.'}, 
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            from apps.analytics.services.learning_path_optimizer import approve_milestone_task
            if action == 'APPROVE':
                result = approve_milestone_task(intern_id, int(milestone_index))
                return Response(result, status=status.HTTP_200_OK)
            else:
                # REJECT logic: clear task_details
                from apps.analytics.models import LearningPath
                path = LearningPath.objects.filter(intern_id=intern_id).order_by('-updated_at').first()
                if path and 0 <= int(milestone_index) < len(path.milestones):
                    path.milestones[int(milestone_index)]['task_details'] = None
                    path.save()
                    return Response({'message': 'Task rejected and cleared.'}, status=status.HTTP_200_OK)
                return Response({'error': 'Milestone not found.'}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"ReviewMilestoneTaskView error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# AI Project Assistant Chatbot View
# ============================================================================

class AIChatBotView(APIView):
    """
    POST /api/analytics/chat/
    
    A project-specific AI assistant that guides users through the platform.
    Strictly limited to platform-related knowledge.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user_message = request.data.get('message')
        chat_history = request.data.get('history', [])
        
        if not user_message:
            return Response(
                {'error': 'Message is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.analytics.services.chatbot_service import get_chatbot_service
            service = get_chatbot_service()
            
            # Optionally add user context for personalization
            user_context = f"User Name: {request.user.full_name or request.user.email}, Role: {request.user.role}"
            history_with_context = chat_history + [{"role": "system", "content": f"Personalized context: {user_context}"}]
            
            result = service.get_response(user_message, chat_history=history_with_context)
            
            if 'error' in result:
                return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"AIChatBotView error: {e}")
            return Response(
                {'error': 'Failed to process chat message.', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
