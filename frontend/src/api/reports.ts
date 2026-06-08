import api from './axios';
import type {
  WeeklyReportV2,
  EmploymentStage,
  PhaseEvaluation,
  PaginatedResponse,
  SelfReportFormData,
} from '../types/reports';

// ── Weekly Reports (V2) ──────────────────────────────────────────────────────────

export const fetchMyReportsV2 = (): Promise<PaginatedResponse<WeeklyReportV2>> =>
  api.get('/analytics/reports-v2/').then(r => {
    if (Array.isArray(r.data)) return { results: r.data, count: r.data.length, next: null, previous: null };
    return r.data;
  });

export const fetchAllReportsV2 = (params?: {
  red_flag?: boolean;
  is_auto_generated?: boolean;
  week_start?: string;
  intern_id?: number;
}): Promise<PaginatedResponse<WeeklyReportV2>> =>
  api.get('/analytics/reports-v2/', { params }).then(r => {
    if (Array.isArray(r.data)) return { results: r.data, count: r.data.length, next: null, previous: null };
    return r.data;
  });

export const fetchReportV2ById = (id: number): Promise<WeeklyReportV2> =>
  api.get(`/analytics/reports-v2/${id}/`).then(r => r.data);

export const submitSelfReportV2 = (data: SelfReportFormData): Promise<WeeklyReportV2> =>
  api.post('/analytics/reports-v2/', data).then(r => r.data);

export const addManagerCommentV2 = (id: number, comment: string): Promise<{ detail: string }> =>
  api.post(`/analytics/reports-v2/${id}/comment/`, { manager_comment: comment }).then(r => r.data);

export const markReportReviewedV2 = (id: number): Promise<{ detail: string }> =>
  api.patch(`/analytics/reports-v2/${id}/mark-reviewed/`).then(r => r.data);

// ── Employment Stages (V2) ────────────────────────────────────────────────────────
export interface StageFilter {
  intern_id?: number;
}

export const fetchMyStages = (params?: StageFilter): Promise<EmploymentStage[]> =>
  api.get('/analytics/stages/', { params }).then(r => r.data.results ?? r.data);

export const fetchStageById = (id: number): Promise<EmploymentStage> =>
  api.get(`/analytics/stages/${id}/`).then(r => r.data);

// ── Phase Evaluations (V2) ────────────────────────────────────────────────────────
export const fetchMyEvaluations = (params?: StageFilter): Promise<PhaseEvaluation[]> =>
  api.get('/analytics/evaluations/', { params }).then(r => r.data.results ?? r.data);

export const fetchEvaluationById = (id: number): Promise<PhaseEvaluation> =>
  api.get(`/analytics/evaluations/${id}/`).then(r => r.data);

// ── Certificates (V2) ─────────────────────────────────────────────────────────────
export interface CertificateRecord {
  id: number;
  unique_cert_id: string;
  cert_type: string;
  cert_type_display: string;
  issue_date: string;
  overall_score_at_issue: number;
  is_revoked: boolean;
}

export const fetchCertificates = (params?: StageFilter): Promise<CertificateRecord[]> =>
  api.get('/analytics/admin/certificates/', { params }).then(r => r.data.results ?? r.data);

export interface ConversionScoreData {
  composite_score: number;
  computed_at: string;
}

export const fetchConversionScore = (params?: StageFilter): Promise<ConversionScoreData | null> =>
  api.get('/analytics/conversion-score/', { params }).then(r => r.data).catch(() => null);
