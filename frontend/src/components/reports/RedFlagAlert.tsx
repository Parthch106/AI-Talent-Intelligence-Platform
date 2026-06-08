import React from 'react';

interface Props {
  internName: string;
  weekStart: string;
  reasons: string[];
  onView: () => void;            // Navigate to the full report
  isConsecutive?: boolean;       // True = 2+ weeks in a row
}

const RedFlagAlert: React.FC<Props> = ({
  internName,
  weekStart,
  reasons,
  onView,
  isConsecutive = false,
}) => {
  return (
    <div
      role="alert"
      style={{
        background: isConsecutive
          ? 'linear-gradient(135deg, #3d0000 0%, #1a0000 100%)'
          : 'linear-gradient(135deg, #2d1b1b 0%, #1a1212 100%)',
        border: `1px solid ${isConsecutive ? '#ef4444' : '#dc2626'}`,
        borderLeft: `4px solid ${isConsecutive ? '#ef4444' : '#dc2626'}`,
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>
        {isConsecutive ? '🚨' : '⚠️'}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontWeight: 700,
            color: '#fca5a5',
            fontSize: '14px',
          }}>
            {isConsecutive ? 'ESCALATION — ' : ''}{internName}
          </span>
          {isConsecutive && (
            <span style={{
              background: '#7f1d1d',
              color: '#fca5a5',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>
              2nd Consecutive Week
            </span>
          )}
          <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: 'auto' }}>
            Week of {new Date(weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Reasons list */}
        <ul style={{
          margin: '0 0 8px',
          padding: '0 0 0 16px',
          color: '#fca5a5',
          fontSize: '12px',
          lineHeight: 1.6,
        }}>
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>

        <button
          onClick={onView}
          style={{
            background: 'transparent',
            border: '1px solid #dc2626',
            color: '#fca5a5',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#7f1d1d')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          View Full Report →
        </button>
      </div>
    </div>
  );
};

export default RedFlagAlert;
