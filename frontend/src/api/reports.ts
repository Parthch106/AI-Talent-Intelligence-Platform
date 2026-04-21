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

export const fetchMyStages = (): Promise<EmploymentStage[]> =>
  api.get('/analytics/stages/').then(r => r.data.results ?? r.data);

export const fetchStageById = (id: number): Promise<EmploymentStage> =>
  api.get(`/analytics/stages/${id}/`).then(r => r.data);

// ── Phase Evaluations (V2) ────────────────────────────────────────────────────────

export const fetchMyEvaluations = (): Promise<PhaseEvaluation[]> =>
  api.get('/analytics/evaluations/').then(r => r.data.results ?? r.data);

export const fetchEvaluationById = (id: number): Promise<PhaseEvaluation> =>
  api.get(`/analytics/evaluations/${id}/`).then(r => r.data);
