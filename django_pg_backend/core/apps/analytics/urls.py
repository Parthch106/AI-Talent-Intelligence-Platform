from django.urls import path
from .views import (
    DashboardStatsView,
    InternIntelligenceView,
    ComputeIntelligenceView,
    ManagerDashboardView,
    AdminDashboardView,
    SkillGapAnalysisView,
    # Phase 2 - Part 2 Views
    TaskTrackingView,
    TaskEvaluationView,
    AttendanceRecordView,
    MyAttendanceView,
    WeeklyReportView,
    PerformanceMetricsView,
    ComputePerformanceMetricsView,
    MonthlyEvaluationView,
    DropoutRiskDashboardView,
    PPOEligibilityDashboardView,
)
from .views_talent_intelligence import (
    AnalyzeInternView,
    AnalyzeAllInternsView,
    GetInternAnalysisView,
    JobRoleListView,
    ApplicationListView,
    LegacyIntelligenceView,
    LegacyComputeIntelligenceView,
)

urlpatterns = [
    # ============================================================================
    # BACKWARD COMPATIBLE ENDPOINTS FOR FRONTEND (USING NEW ML PIPELINE)
    # ============================================================================
    
    # Legacy endpoints matching old frontend interface - now using new ML pipeline
    path('intelligence/', LegacyIntelligenceView.as_view(), name='intern-intelligence'),
    path('intelligence/compute/', LegacyComputeIntelligenceView.as_view(), name='compute-intelligence'),
    path('intelligence/compute/<int:intern_id>/', LegacyComputeIntelligenceView.as_view(), name='compute-intelligence-detail'),
    
    # Other analytics endpoints
    path('summary/', DashboardStatsView.as_view(), name='dashboard-summary'),
    path('manager/', ManagerDashboardView.as_view(), name='manager-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('skill-gaps/', SkillGapAnalysisView.as_view(), name='skill-gap-analysis'),

    # ============================================================================
    # PHASE 2 - PART 2: During Internship Monitoring URLs
    # ============================================================================

    # Task Tracking
    path('tasks/', TaskTrackingView.as_view(), name='task-tracking'),
    path('tasks/create/', TaskTrackingView.as_view(), name='task-create'),
    path('tasks/<int:task_id>/update-status/', TaskTrackingView.as_view(), name='task-update-status'),
    path('tasks/<int:task_id>/evaluate/', TaskEvaluationView.as_view(), name='task-evaluate'),
    path('tasks/evaluate/', TaskEvaluationView.as_view(), name='task-evaluate-list'),

    # Attendance
    path('attendance/', AttendanceRecordView.as_view(), name='attendance'),
    path('attendance/mark/', AttendanceRecordView.as_view(), name='attendance-mark'),
    path('attendance/my-attendance/', MyAttendanceView.as_view(), name='my-attendance'),

    # Weekly Reports
    path('weekly-reports/', WeeklyReportView.as_view(), name='weekly-reports'),
    path('weekly-reports/submit/', WeeklyReportView.as_view(), name='weekly-report-submit'),

    # Performance Metrics
    path('performance/', PerformanceMetricsView.as_view(), name='performance-metrics'),
    path('performance/compute/', ComputePerformanceMetricsView.as_view(), name='performance-compute'),

    # Monthly Evaluations
    path('monthly-evaluations/', MonthlyEvaluationView.as_view(), name='monthly-evaluations'),

    # Dashboards
    path('dropout-risk/', DropoutRiskDashboardView.as_view(), name='dropout-risk-dashboard'),
    path('ppo-eligibility/', PPOEligibilityDashboardView.as_view(), name='ppo-eligibility-dashboard'),

    # ============================================================================
    # NEW TALENT INTELLIGENCE SYSTEM URLs
    # ============================================================================

    # Resume Analysis
    path('analyze/', AnalyzeInternView.as_view(), name='analyze-intern'),
    path('analyze-all/', AnalyzeAllInternsView.as_view(), name='analyze-all-interns'),
    path('intern/<int:intern_id>/', GetInternAnalysisView.as_view(), name='get-intern-analysis'),
    
    # Job Roles
    path('job-roles/', JobRoleListView.as_view(), name='job-roles'),
    
    # Applications
    path('applications/', ApplicationListView.as_view(), name='applications'),
]
