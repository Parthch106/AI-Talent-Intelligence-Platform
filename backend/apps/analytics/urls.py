from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    # Heatmap Views
    TaskHeatmapView,
    AttendanceHeatmapView,
    # RL & Learning Path Views
    RLAssignTaskView,
    RLTopTasksView,
    RLOptimalDifficultyView,
    LearningPathView,
    LearningPathProgressView,
    # Performance Evaluation Output Layer
    PerformanceEvaluationView,
    PerformanceStatusView,
    PerformanceSuggestionsView,
    PerformanceDashboardView,
    # LLM Task Generator
    LLMTaskSuggestionView,
    LLMTaskReviewView,
    # Custom Skill Paths
    SkillListView,
    LLMLearningPathSuggestionView,
    LLMMilestoneTaskView,
    ReviewMilestoneTaskView,
    AIChatBotView,
    # V2 Phase 1 — Career Progression
    EmploymentStageViewSet,
    PhaseEvaluationViewSet,
    CertificationCriteriaViewSet,
    WeeklyReportV2ViewSet,
    CriteriaPreviewView,
    verify_certificate,
    FullTimeOfferViewSet,
    InternOfferResponseView,
    ConversionScoreView,
    CertificateRevokeView,
    CertificateReinstateView,
    WeeklyReportBulkPDFExportView,
    CertificationRecordViewSet,
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

# ── V2 Phase 1 ViewSet Router ─────────────────────────────────────────────────
v2_router = DefaultRouter()
v2_router.register(r'stages',         EmploymentStageViewSet,       basename='employment-stage')
v2_router.register(r'evaluations',    PhaseEvaluationViewSet,       basename='phase-evaluation')
v2_router.register(r'reports-v2',     WeeklyReportV2ViewSet,        basename='weekly-report-v2')
v2_router.register(r'admin/criteria', CertificationCriteriaViewSet, basename='certification-criteria')
v2_router.register(r'admin/certificates', CertificationRecordViewSet, basename='certification-record')
v2_router.register(r'offers-v2',      FullTimeOfferViewSet,         basename='full-time-offer')

urlpatterns = [
    # ============================================================================
    # PHASE 5 — FULL-TIME OFFERS & CONVERSION SCORES
    # ============================================================================
    path('offers-v2/<int:pk>/respond/', InternOfferResponseView.as_view(), name='offer-respond'),
    path('conversion-score/', ConversionScoreView.as_view(), name='conversion-score'),
    path('admin/certificates/<int:pk>/revoke/',    CertificateRevokeView.as_view(),    name='certificate-revoke'),
    path('admin/certificates/<int:pk>/reinstate/', CertificateReinstateView.as_view(), name='certificate-reinstate'),
    path('admin/reports/export-pdf/',             WeeklyReportBulkPDFExportView.as_view(), name='weekly-report-bulk-pdf'),

    # ============================================================================
    # BACKWARD COMPATIBLE ENDPOINTS FOR FRONTEND (USING NEW ML PIPELINE)
    # ============================================================================

    path('intelligence/', LegacyIntelligenceView.as_view(), name='intern-intelligence'),
    path('intelligence/compute/', LegacyComputeIntelligenceView.as_view(), name='compute-intelligence'),
    path('intelligence/compute/<int:intern_id>/', LegacyComputeIntelligenceView.as_view(), name='compute-intelligence-detail'),

    path('summary/', DashboardStatsView.as_view(), name='dashboard-summary'),
    path('manager/', ManagerDashboardView.as_view(), name='manager-dashboard'),
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('skill-gaps/', SkillGapAnalysisView.as_view(), name='skill-gap-analysis'),

    # ============================================================================
    # PHASE 2 - PART 2: During Internship Monitoring URLs
    # ============================================================================

    path('tasks/', TaskTrackingView.as_view(), name='task-tracking'),
    path('tasks/create/', TaskTrackingView.as_view(), name='task-create'),
    path('tasks/<int:task_id>/', TaskTrackingView.as_view(), name='task-detail'),
    path('tasks/<int:task_id>/update-status/', TaskTrackingView.as_view(), name='task-update-status'),
    path('tasks/<int:task_id>/evaluate/', TaskEvaluationView.as_view(), name='task-evaluate'),
    path('tasks/evaluate/', TaskEvaluationView.as_view(), name='task-evaluate-list'),

    path('attendance/', AttendanceRecordView.as_view(), name='attendance'),
    path('attendance/mark/', AttendanceRecordView.as_view(), name='attendance-mark'),
    path('attendance/my-attendance/', MyAttendanceView.as_view(), name='my-attendance'),

    path('weekly-reports/', WeeklyReportView.as_view(), name='weekly-reports'),
    path('weekly-reports/submit/', WeeklyReportView.as_view(), name='weekly-report-submit'),

    path('performance/', PerformanceMetricsView.as_view(), name='performance-metrics'),
    path('performance/compute/', ComputePerformanceMetricsView.as_view(), name='performance-compute'),

    path('monthly-evaluations/', MonthlyEvaluationView.as_view(), name='monthly-evaluations'),

    path('dropout-risk/', DropoutRiskDashboardView.as_view(), name='dropout-risk-dashboard'),
    path('ppo-eligibility/', PPOEligibilityDashboardView.as_view(), name='ppo-eligibility-dashboard'),

    # ============================================================================
    # NEW TALENT INTELLIGENCE SYSTEM URLs
    # ============================================================================

    path('analyze/', AnalyzeInternView.as_view(), name='analyze-intern'),
    path('analyze-all/', AnalyzeAllInternsView.as_view(), name='analyze-all-interns'),
    path('intern/<int:intern_id>/', GetInternAnalysisView.as_view(), name='get-intern-analysis'),
    path('job-roles/', JobRoleListView.as_view(), name='job-roles'),
    path('applications/', ApplicationListView.as_view(), name='applications'),

    # ============================================================================
    # HEATMAP VISUALIZATION ENDPOINTS
    # ============================================================================
    path('heatmap/tasks/', TaskHeatmapView.as_view(), name='task-heatmap'),
    path('heatmap/attendance/', AttendanceHeatmapView.as_view(), name='attendance-heatmap'),

    # ============================================================================
    # RL DYNAMIC TASK ASSIGNMENT & LEARNING PATH ENDPOINTS
    # ============================================================================
    path('rl/assign-task/', RLAssignTaskView.as_view(), name='rl-assign-task'),
    path('rl/top-tasks/', RLTopTasksView.as_view(), name='rl-top-tasks'),
    path('rl/optimal-difficulty/<int:intern_id>/', RLOptimalDifficultyView.as_view(), name='rl-optimal-difficulty'),
    path('learning-path/<int:intern_id>/', LearningPathView.as_view(), name='learning-path'),
    path('learning-path/<int:intern_id>/progress/', LearningPathProgressView.as_view(), name='learning-path-progress'),

    # ============================================================================
    # PERFORMANCE EVALUATION OUTPUT LAYER
    # ============================================================================
    path('performance/evaluate/', PerformanceEvaluationView.as_view(), name='performance-evaluate'),
    path('performance/status/<int:intern_id>/', PerformanceStatusView.as_view(), name='performance-status'),
    path('performance/suggestions/<int:intern_id>/', PerformanceSuggestionsView.as_view(), name='performance-suggestions'),
    path('performance/dashboard/<int:intern_id>/', PerformanceDashboardView.as_view(), name='performance-dashboard'),

    # ============================================================================
    # LLM TASK GENERATOR
    # ============================================================================
    path('llm/generate-tasks/', LLMTaskSuggestionView.as_view(), name='llm-generate-tasks'),
    path('llm/review-task/', LLMTaskReviewView.as_view(), name='llm-review-task'),
    path('llm/suggest-path/', LLMLearningPathSuggestionView.as_view(), name='llm-suggest-path'),
    path('skills/', SkillListView.as_view(), name='skill-list'),
    path('learning-path/generate-milestone-task/', LLMMilestoneTaskView.as_view(), name='llm-generate-milestone-task'),
    path('learning-path/review-milestone-task/', ReviewMilestoneTaskView.as_view(), name='review-milestone-task'),

    # ============================================================================
    # AI PROJECT ASSISTANT CHATBOT
    # ============================================================================
    path('chat/', AIChatBotView.as_view(), name='ai-chat'),

    # ============================================================================
    # V2 PHASE 1 — CAREER PROGRESSION PIPELINE
    # ============================================================================
    # Standalone admin endpoint MUST be registered before the router include
    # to prevent the router from capturing 'admin/criteria/preview/' as a detail pk.
    path('admin/criteria/preview/', CriteriaPreviewView.as_view(), name='criteria-preview'),

    # ViewSet routes: stages/, evaluations/, admin/criteria/ + CRUD detail routes
    path('', include(v2_router.urls)),

    # ============================================================================
    # V2 PHASE 2 — CERTIFICATION ENGINE
    # ============================================================================
    path('verify/<uuid:unique_cert_id>/', verify_certificate, name='verify-certificate'),
]
