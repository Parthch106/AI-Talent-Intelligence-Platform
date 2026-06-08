import api from './axios';

export type CertificationCriteria = {
  id: number;
  phase: 'PHASE_1' | 'PHASE_2' | 'PPO';
  min_overall_score: number;
  min_productivity_score?: number;
  min_quality_score?: number;
  min_engagement_score?: number;
  min_attendance_pct?: number;
  min_weekly_reports_submitted?: number;
  is_active: boolean;
  description: string;
  created_at: string;
};

export type CriteriaPreview = {
  would_pass: number;
  would_fail: number;
  total_affected: number;
  delta: number;
};

export const fetchCriteria = (): Promise<CertificationCriteria[]> =>
  api.get('/analytics/admin/criteria/').then(r => r.data.results ?? r.data);

export const updateCriteria = (id: number, data: Partial<CertificationCriteria>): Promise<CertificationCriteria> =>
  api.patch(`/analytics/admin/criteria/${id}/`, data).then(r => r.data);

export const createCriteria = (data: Partial<CertificationCriteria>): Promise<CertificationCriteria> =>
  api.post('/analytics/admin/criteria/', data).then(r => r.data);

export const previewCriteria = (data: Partial<CertificationCriteria>): Promise<CriteriaPreview> =>
  api.post('/analytics/admin/criteria/preview/', data).then(r => r.data);
