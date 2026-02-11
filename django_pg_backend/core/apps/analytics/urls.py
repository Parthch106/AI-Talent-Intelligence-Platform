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
    AttendanceRecordView,
    WeeklyReportView,
    PerformanceMetricsView,
    ComputePerformanceMetricsView,
    MonthlyEvaluationView,
    DropoutRiskDashboardView,
    PPOEligibilityDashboardView,
)

urlpatterns = [
    # Existing URLs
    path('summary/', DashboardStatsView.as_view(), name='dashboard-summary'),
    path('intelligence/', InternIntelligenceView.as_view(), name='intern-intelligence'),
    path('intelligence/compute/', ComputeIntelligenceView.as_view(), name='compute-intelligence'),
    path('intelligence/compute/<int:intern_id>/', ComputeIntelligenceView.as_view(), name='compute-intelligence-detail'),
    path('manager/', ManagerDashboardView.as_view(), name='manager-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('skill-gaps/', SkillGapAnalysisView.as_view(), name='skill-gap-analysis'),

    # ============================================================================
    # PHASE 2 - PART 2: During Internship Monitoring URLs
    # ============================================================================

    # Task Tracking
    path('tasks/', TaskTrackingView.as_view(), name='task-tracking'),
    path('tasks/create/', TaskTrackingView.as_view(), name='task-create'),

    # Attendance
    path('attendance/', AttendanceRecordView.as_view(), name='attendance'),
    path('attendance/mark/', AttendanceRecordView.as_view(), name='attendance-mark'),

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
]
