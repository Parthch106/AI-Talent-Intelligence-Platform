from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from django.utils import timezone
from apps.interns.models import InternProfile
from apps.projects.models import Project
from apps.accounts.models import User
from apps.analytics.services import AnalyticsDashboardService
from apps.analytics.services.internship_monitoring_service import InternshipMonitoringService
from apps.analytics.models import (
    TaskTracking,
    AttendanceRecord,
    WeeklyReport,
    PerformanceMetrics,
    MonthlyEvaluationReport,
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

        if user.role == 'ADMIN':
            data['total_managers'] = User.objects.filter(role=User.Role.MANAGER).count()
            data['total_interns'] = User.objects.filter(role=User.Role.INTERN).count()
            data['total_projects'] = Project.objects.count()
            data['active_projects'] = Project.objects.filter(status='IN_PROGRESS').count()
            data['role'] = 'ADMIN'
            
        elif user.role == 'MANAGER':
            # My Interns (assigned to my projects)
            my_interns_count = InternProfile.objects.filter(user__assigned_projects__project__mentor=user).distinct().count()
            data['total_interns'] = my_interns_count
            
            # My Projects
            my_projects = Project.objects.filter(mentor=user)
            data['total_projects'] = my_projects.count()
            data['active_projects'] = my_projects.filter(status='IN_PROGRESS').count()
            
            # Pending Reviews? (Placeholder logic)
            data['pending_reviews'] = 0 
            data['role'] = 'MANAGER'

        elif user.role == 'INTERN':
            # My Projects
            my_assignments = user.assigned_projects.all()
            data['assigned_projects'] = my_assignments.count()
            data['completed_projects'] = my_assignments.filter(status='COMPLETED').count()
            
            # My Feedback score (average?) - placeholder
            data['average_score'] = "N/A"
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
        
        from apps.analytics.models import InternIntelligence
        from django.db.models import Count
        
        # Get all interns with skill gaps
        interns = User.objects.filter(role='INTERN')
        intelligence_qs = InternIntelligence.objects.filter(user__in=interns)
        
        # Aggregate skill gaps
        all_gaps = []
        for intel in intelligence_qs:
            all_gaps.extend(intel.skill_gaps or [])
        
        gap_counts = {}
        for gap in all_gaps:
            gap_counts[gap] = gap_counts.get(gap, 0) + 1
        
        # Sort by frequency
        common_gaps = sorted(gap_counts.items(), key=lambda x: x[1], reverse=True)[:15]
        
        return Response({
            'common_gaps': [
                {'skill': gap, 'count': count}
                for gap, count in common_gaps
            ],
            'total_interns_analyzed': intelligence_qs.count(),
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
            'status': task.status,
            'priority': task.priority,
            'complexity': task.complexity,
            'assigned_at': task.assigned_at,
            'due_date': task.due_date,
            'completed_at': task.completed_at,
            'quality_rating': task.quality_rating,
            'code_review_score': task.code_review_score,
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

        task = TaskTracking.objects.create(
            intern=intern,
            task_id=task_data.get('task_id'),
            title=task_data.get('title'),
            description=task_data.get('description', ''),
            status=task_data.get('status', 'ASSIGNED'),
            priority=task_data.get('priority', 'MEDIUM'),
            complexity=task_data.get('complexity', 'MODERATE'),
            due_date=task_data.get('due_date'),
            estimated_hours=task_data.get('estimated_hours', 0.0),
        )

        return Response({
            'message': 'Task created successfully',
            'task_id': task.id
        }, status=status.HTTP_201_CREATED)


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

        # Get attendance
        attendance = AttendanceRecord.objects.filter(intern_id=target_id)

        if start_date:
            attendance = attendance.filter(date__gte=start_date)
        if end_date:
            attendance = attendance.filter(date__lte=end_date)

        data = [{
            'id': record.id,
            'date': record.date,
            'status': record.status,
            'check_in_time': record.check_in_time,
            'check_out_time': record.check_out_time,
            'working_hours': record.working_hours,
            'notes': record.notes,
        } for record in attendance]

        return Response({'attendance': data})

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


class WeeklyReportView(APIView):
    """
    API endpoint for weekly reports.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get weekly reports for an intern."""
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

        reports = WeeklyReport.objects.filter(intern_id=target_id)

        data = [{
            'id': report.id,
            'week_start_date': report.week_start_date,
            'week_end_date': report.week_end_date,
            'tasks_completed': report.tasks_completed,
            'tasks_in_progress': report.tasks_in_progress,
            'tasks_blocked': report.tasks_blocked,
            'accomplishments': report.accomplishments,
            'challenges': report.challenges,
            'learnings': report.learnings,
            'next_week_goals': report.next_week_goals,
            'self_rating': report.self_rating,
            'is_submitted': report.is_submitted,
            'submitted_at': report.submitted_at,
            'is_reviewed': report.is_reviewed,
        } for report in reports]

        return Response({'weekly_reports': data})

    def post(self, request):
        """Submit a weekly report."""
        user = request.user

        report_data = request.data
        intern_id = report_data.get('intern_id', user.id)

        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        report, created = WeeklyReport.objects.update_or_create(
            intern=intern,
            week_start_date=report_data.get('week_start_date'),
            defaults={
                'week_end_date': report_data.get('week_end_date'),
                'tasks_completed': report_data.get('tasks_completed', 0),
                'tasks_in_progress': report_data.get('tasks_in_progress', 0),
                'tasks_blocked': report_data.get('tasks_blocked', 0),
                'accomplishments': report_data.get('accomplishments', ''),
                'challenges': report_data.get('challenges', ''),
                'learnings': report_data.get('learnings', ''),
                'next_week_goals': report_data.get('next_week_goals', ''),
                'self_rating': report_data.get('self_rating'),
                'is_submitted': True,
                'submitted_at': timezone.now(),
            }
        )

        return Response({
            'message': 'Weekly report submitted successfully',
            'id': report.id
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
