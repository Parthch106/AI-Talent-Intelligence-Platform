// ── Weekly Report V2 ───────────────────────────────────────────────────────────

export interface WeeklyReportV2 {
  id: number;
  intern: number;
  intern_name: string;
  week_start: string;       // ISO date string "YYYY-MM-DD"
  week_end: string;
  week_number: number;
  is_auto_generated: boolean;

  // Task metrics
  tasks_assigned: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_overdue: number;
  avg_task_quality_rating: number | null;
  total_estimated_hours: number;
  total_actual_hours: number;
  hour_variance_pct: number | null;
  completion_rate: number;    // Computed property from backend
  hour_efficiency: number | null;

  // Attendance
  attendance_days: number;
  expected_days: number;
  late_check_ins: number;
  attendance_pct: number;

  // Scores
  productivity_score: number | null;
  quality_score: number | null;
  engagement_score: number | null;
  growth_score: number | null;
  overall_weekly_score: number | null;

  // Deltas
  productivity_delta: number | null;
  quality_delta: number | null;
  overall_delta: number | null;
  cumulative_overall_score: number | null;

  // AI narrative
  ai_narrative: string;
  ai_top_achievement: string;
  ai_concern_area: string;
  ai_growth_note: string;

  // Red flags
  red_flag: boolean;
  red_flag_reasons: string[];

  // Self-report mismatch
  intern_self_report: number | null;
  self_report_mismatch: boolean;
  self_report_mismatch_details: string[];

  // Manager review
  manager_reviewed: boolean;
  manager_comment: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;

  created_at: string;
}

// ── Employment Stage ───────────────────────────────────────────────────────────

export type Phase = 'PHASE_1' | 'PHASE_2' | 'FULL_TIME';

export interface EmploymentStage {
  id: number;
  intern: number;
  intern_name: string;
  phase: Phase;
  phase_display: string;
  phase_start_date: string;
  phase_end_date: string | null;
  stipend_amount: string | null;
  conversion_score: number | null;
  promoted_by: number | null;
  promoted_by_name: string | null;
  created_at: string;
}

// ── Phase Evaluation ──────────────────────────────────────────────────────────

export type EvaluationDecision = 'PROMOTE' | 'EXTEND' | 'DECLINE';

export interface PhaseEvaluation {
  id: number;
  intern: number;
  intern_name: string;
  employment_stage: number;
  evaluated_by: number | null;
  evaluated_by_name: string | null;
  evaluated_at: string;
  overall_score: number;
  productivity_score: number;
  quality_score: number;
  engagement_score: number;
  attendance_pct: number;
  weekly_reports_submitted: number;
  ai_recommendation: string;
  ai_decision_suggestion: EvaluationDecision | '';
  ai_decision_suggestion_display: string;
  decision: EvaluationDecision;
  decision_display: string;
  manager_notes: string;
  criteria_snapshot: Record<string, any>;
  criteria_met: boolean;
}

// ── API Response Wrappers ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Self-report submission form ───────────────────────────────────────────────

export interface SelfReportFormData {
  week_start: string;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_overdue: number;
  attendance_days: number;
  total_actual_hours: number;
}
