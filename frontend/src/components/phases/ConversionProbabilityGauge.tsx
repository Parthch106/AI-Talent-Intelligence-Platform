import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  score: number | null;    // 0–100
  size?: number;
}

const ConversionProbabilityGauge: React.FC<Props> = ({ score, size = 180 }) => {
  const displayScore = score ?? 0;

  const color = displayScore >= 80 ? '#34d399'
    : displayScore >= 60 ? '#fbbf24'
    : '#f87171';

  const label = displayScore >= 80 ? 'High Likelihood'
    : displayScore >= 60 ? 'Moderate'
    : score === null ? 'Pending Data'
    : 'Needs Improvement';

  const data = [{ name: 'score', value: displayScore, fill: color }];

  return (
    <div style={{ textAlign: 'center', width: size, margin: '0 auto' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.04)' }}
              dataKey="value"
              cornerRadius={8}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center text overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '26px',
            fontWeight: 800,
            color: score === null ? '#6b7280' : color,
            lineHeight: 1,
          }}>
            {score !== null ? `${displayScore.toFixed(0)}%` : '—'}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px', lineHeight: 1.2 }}>
            FTE<br/>Probability
          </div>
        </div>
      </div>

      {/* Label below gauge */}
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        fontWeight: 700,
        color: score === null ? '#6b7280' : color,
      }}>
        {label}
      </div>
      {score === null && (
        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
          Available after Phase 2
        </div>
      )}
    </div>
  );
};

export default ConversionProbabilityGauge;
