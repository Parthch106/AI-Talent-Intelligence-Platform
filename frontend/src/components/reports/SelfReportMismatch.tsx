import React from 'react';

interface Props {
  discrepancies: string[];
  systemReport: {
    tasks_completed: number;
    attendance_days: number;
    total_actual_hours: number;
    tasks_overdue: number;
  };
  selfReport: {
    tasks_completed: number;
    attendance_days: number;
    total_actual_hours: number;
    tasks_overdue: number;
  } | null;
}

const SelfReportMismatch: React.FC<Props> = ({
  discrepancies,
  systemReport,
  selfReport,
}) => {
  if (!discrepancies.length) return null;

  const rows: { label: string; sysKey: keyof typeof systemReport; unit?: string }[] = [
    { label: 'Tasks Completed', sysKey: 'tasks_completed' },
    { label: 'Attendance Days', sysKey: 'attendance_days', unit: 'days' },
    { label: 'Actual Hours', sysKey: 'total_actual_hours', unit: 'h' },
    { label: 'Overdue Tasks', sysKey: 'tasks_overdue' },
  ];

  return (
    <div style={{
      background: 'rgba(251, 191, 36, 0.06)',
      border: '1px solid #d97706',
      borderRadius: '10px',
      padding: '14px 16px',
      marginTop: '12px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '16px' }}>🔍</span>
        <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '13px' }}>
          Self-Report Mismatch Detected
        </span>
      </div>

      {/* Comparison table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#9ca3af', paddingBottom: '8px', fontWeight: 600 }}>
                Field
              </th>
              <th style={{ textAlign: 'center', color: '#60a5fa', paddingBottom: '8px', fontWeight: 600 }}>
                System Record
              </th>
              <th style={{ textAlign: 'center', color: '#fbbf24', paddingBottom: '8px', fontWeight: 600 }}>
                Intern Reported
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, sysKey, unit }) => {
              const sysVal = systemReport[sysKey];
              const selfVal = selfReport?.[sysKey] ?? '—';
              const isDiff = selfReport && Math.abs(Number(sysVal) - Number(selfVal)) > 0;
              return (
                <tr
                  key={sysKey}
                  style={{ background: isDiff ? 'rgba(251, 191, 36, 0.05)' : 'transparent' }}
                >
                  <td style={{ padding: '5px 0', color: '#d1d5db' }}>{label}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', color: '#93c5fd', fontWeight: 600 }}>
                    {sysVal}{unit}
                  </td>
                  <td style={{
                    padding: '5px 8px',
                    textAlign: 'center',
                    color: isDiff ? '#fcd34d' : '#d1d5db',
                    fontWeight: isDiff ? 700 : 400,
                  }}>
                    {selfVal !== '—' ? `${selfVal}${unit ?? ''}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Discrepancy reasons */}
      <div style={{ marginTop: '10px', borderTop: '1px solid #44403c', paddingTop: '10px' }}>
        <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
          Flagged discrepancies:
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 14px', color: '#fcd34d', fontSize: '11px', lineHeight: 1.6 }}>
          {discrepancies.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default SelfReportMismatch;
