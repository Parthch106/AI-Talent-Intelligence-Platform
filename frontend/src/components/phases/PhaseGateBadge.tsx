import React from 'react';
import type { Phase } from '../../types/reports';

type GateStatus = 'AWAITING_GATE' | 'PHASE_COMPLETE' | 'GATE_FAILED' | 'EXTENDED' | 'ACTIVE';

interface Props {
  phase: Phase;
  status: GateStatus;
}

const config: Record<GateStatus, { label: string; bg: string; color: string; icon: string }> = {
  ACTIVE:       { label: 'Active',           bg: '#064e3b', color: '#6ee7b7', icon: '●' },
  AWAITING_GATE:{ label: 'Awaiting Gate',    bg: '#1e1b4b', color: '#a5b4fc', icon: '⏳' },
  PHASE_COMPLETE:{ label: 'Phase Complete',  bg: '#065f46', color: '#34d399', icon: '✓' },
  GATE_FAILED:  { label: 'Did Not Pass',     bg: '#7f1d1d', color: '#fca5a5', icon: '✗' },
  EXTENDED:     { label: 'Phase Extended',   bg: '#451a03', color: '#fcd34d', icon: '↻' },
};

const PhaseGateBadge: React.FC<Props> = ({ phase, status }) => {
  const { label, bg, color, icon } = config[status] ?? config.ACTIVE;
  const phaseLabel = phase === 'PHASE_1' ? 'Phase 1' : phase === 'PHASE_2' ? 'Phase 2' : 'Full-Time';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: bg,
      color,
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.3px',
    }}>
      <span>{icon}</span>
      <span>{phaseLabel} — {label}</span>
    </span>
  );
};

export default PhaseGateBadge;
