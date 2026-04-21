import React, { useEffect, useState, useCallback } from 'react';
import ReportTimeline from '../components/reports/ReportTimeline';
import { fetchMyReportsV2, submitSelfReportV2 } from '../api/reports';
import type { WeeklyReportV2, SelfReportFormData } from '../types/reports';

const WeeklyReportsInternPage: React.FC = () => {
  const [reports, setReports]     = useState<WeeklyReportV2[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState<SelfReportFormData>({
    week_start: '',
    tasks_assigned: 0,
    tasks_completed: 0,
    tasks_in_progress: 0,
    tasks_overdue: 0,
    attendance_days: 0,
    total_actual_hours: 0,
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyReportsV2();
      // Support both paginated and non-paginated responses
      const results = Array.isArray(data) ? data : (data?.results || []);
      setReports(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitSelfReportV2(form);
      setShowForm(false);
      await loadReports();
    } finally {
      setSubmitting(false);
    }
  };

  const autoReports = reports.filter(r => r.is_auto_generated);
  const selfReports = reports.filter(r => !r.is_auto_generated);

  return (
    <div style={{ padding: '28px 24px', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#e5e7eb' }}>
            My Weekly Reports
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
            System-generated every Monday • {autoReports.length} weeks tracked
          </p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ Submit Self-Report'}
        </button>
      </div>

      {/* Self-report form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#1e1e2e',
            border: '1px solid #2a2a3e',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#e5e7eb' }}>
            Submit Your Self-Report
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {([
              ['week_start', 'Week Start (Monday)', 'date'],
              ['tasks_assigned',   'Tasks Assigned',    'number'],
              ['tasks_completed',  'Tasks Completed',   'number'],
              ['tasks_in_progress','Tasks In Progress', 'number'],
              ['tasks_overdue',    'Tasks Overdue',     'number'],
              ['attendance_days',  'Days Present',      'number'],
              ['total_actual_hours','Actual Hours',     'number'],
            ] as [keyof SelfReportFormData, string, string][]).map(([key, label, type]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>{label}</span>
                <input
                  type={type}
                  value={form[key] as string | number}
                  onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                  required
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#e5e7eb',
                    padding: '7px 10px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '16px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </form>
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'System Reports', value: autoReports.length, color: '#818cf8' },
          { label: 'Self Reports', value: selfReports.length, color: '#34d399' },
          { label: 'Red Flags', value: reports.filter(r => r.red_flag).length, color: '#f87171' },
          { label: 'Mismatches', value: reports.filter(r => r.self_report_mismatch).length, color: '#fbbf24' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1,
            minWidth: '120px',
            background: '#1e1e2e',
            border: '1px solid #2a2a3e',
            borderRadius: '10px',
            padding: '12px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Report list */}
      <ReportTimeline
        reports={reports}
        isManagerView={false}
        loading={loading}
      />
    </div>
  );
};

export default WeeklyReportsInternPage;
