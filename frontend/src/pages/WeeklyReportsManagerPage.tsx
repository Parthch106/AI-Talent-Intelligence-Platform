import React, { useEffect, useState, useCallback } from 'react';
import RedFlagAlert from '../components/reports/RedFlagAlert';
import WeeklyReportCard from '../components/reports/WeeklyReportCard';
import { fetchAllReportsV2 } from '../api/reports';
import type { WeeklyReportV2 } from '../types/reports';
import { useNavigate } from 'react-router-dom';

const WeeklyReportsManagerPage: React.FC = () => {
  const [reports, setReports]       = useState<WeeklyReportV2[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterIntern, setFilterIntern] = useState('');
  const navigate = useNavigate();

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllReportsV2({ is_auto_generated: true });
      // Support both paginated and non-paginated responses
      const results = Array.isArray(data) ? data : (data?.results || []);
      setReports(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const redFlagReports = (reports || []).filter(r => r?.red_flag);
  const normalReports  = (reports || []).filter(r => !r?.red_flag);

  const filtered = (list: WeeklyReportV2[]) => {
    if (!list) return [];
    return filterIntern
      ? list.filter(r => r?.intern_name?.toLowerCase().includes(filterIntern.toLowerCase()))
      : list;
  };


  return (
    <div style={{ padding: '28px 24px', maxWidth: '900px', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#e5e7eb' }}>
          Weekly Report Feed (V2)
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
          Auto-generated every Monday for all active interns
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Reports', value: reports.length, color: '#818cf8' },
          { label: 'Red Flags', value: redFlagReports.length, color: '#f87171' },
          { label: 'Reviewed', value: reports.filter(r => r.manager_reviewed).length, color: '#34d399' },
          { label: 'Pending Review', value: reports.filter(r => !r.manager_reviewed).length, color: '#fbbf24' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, minWidth: '120px',
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

      {/* Filter */}
      <input
        type="text"
        placeholder="Filter by intern name…"
        value={filterIntern}
        onChange={e => setFilterIntern(e.target.value)}
        style={{
          width: '100%',
          background: '#1e1e2e',
          border: '1px solid #333',
          borderRadius: '8px',
          color: '#e5e7eb',
          padding: '9px 14px',
          fontSize: '13px',
          marginBottom: '20px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Red flag section */}
      {filtered(redFlagReports).length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#f87171',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 12px',
          }}>
            🚩 Red Flags — Needs Attention ({filtered(redFlagReports).length})
          </h2>
          {filtered(redFlagReports).map(r => (
            <RedFlagAlert
              key={r.id}
              internName={r.intern_name}
              weekStart={r.week_start}
              reasons={r.red_flag_reasons}
              onView={() => setFilterIntern(r.intern_name)} // Or navigate to detail if implemented
              isConsecutive={false}
            />
          ))}
        </section>
      )}

      {/* All reports */}
      <section>
        <h2 style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '0 0 12px',
        }}>
          All Reports ({filtered([...redFlagReports, ...normalReports]).length})
        </h2>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading reports…
          </div>
        ) : filtered([...redFlagReports, ...normalReports]).map((r) => (
          <WeeklyReportCard
            key={r.id}
            report={r}
            priorReports={[]}
            isManagerView={true}
            onReviewedChange={loadReports}
          />
        ))}
      </section>
    </div>
  );
};

export default WeeklyReportsManagerPage;
