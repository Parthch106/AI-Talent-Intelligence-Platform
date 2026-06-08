import api from './axios';

export type FullTimeOffer = {
  id: number;
  intern_id: number;
  intern_name: string;
  status: 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  recommended_role_title: string;
  recommended_department: string;
  salary_band_min: string;
  salary_band_max: string;
  ai_onboarding_plan: string;
  ai_offer_summary: string;
  response_deadline: string;
  issued_at?: string;
  intern_response_at?: string;
};

export const fetchOffers = (): Promise<FullTimeOffer[]> =>
  api.get('/analytics/offers-v2/').then(r => r.data.results ?? r.data);

export const createOffer = (data: Partial<FullTimeOffer>): Promise<FullTimeOffer> =>
  api.post('/analytics/offers-v2/', data).then(r => r.data);

export const issueOffer = (id: number): Promise<FullTimeOffer> =>
  api.patch(`/analytics/offers-v2/${id}/issue/`).then(r => r.data);

export const respondToOffer = (id: number, response: 'ACCEPT' | 'DECLINE', notes: string): Promise<FullTimeOffer> =>
  api.patch(`/analytics/offers-v2/${id}/respond/`, { response, notes }).then(r => r.data);
