import api from './axios';

export type StipendRecord = {
  id: number;
  intern_name: string;
  intern_email: string;
  month: string;
  amount: string;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'HELD';
  approved_by_name?: string;
  approved_at?: string;
  disbursed_at?: string;
  notes: string;
  performance_score?: number;
};

export const fetchStipends = (params?: { status?: string; intern_id?: number }): Promise<StipendRecord[]> =>
  api.get('/accounts/stipends/', { params }).then(r => r.data.results ?? r.data);

export const approveStipend = (id: number): Promise<StipendRecord> =>
  api.patch(`/accounts/stipends/${id}/approve/`).then(r => r.data);

export const disburseStipend = (id: number): Promise<StipendRecord> =>
  api.patch(`/accounts/stipends/${id}/disburse/`).then(r => r.data);

export const bulkExportStipends = (params?: { month?: string }): Promise<Blob> =>
  api.get('/accounts/stipends/export/', { params, responseType: 'blob' }).then(r => r.data);
