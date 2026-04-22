import React from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine,
} from 'recharts';

interface SparklinePoint {
  week: string;   // e.g. "W12"
  score: number;
}

interface Props {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
}

const ReportSparkline: React.FC<Props> = ({
  data,
  color = '#6366f1',
  height = 40,
  showTooltip = true,
}) => {
  if (!data || data.length < 2) {
    return (
      <span style={{ fontSize: '11px', color: '#6b7280' }}>
        Not enough data
      </span>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <ReferenceLine y={75} stroke="#374151" strokeDasharray="3 3" />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: '#1e1e2e',
              border: '1px solid #374151',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#fff',
            }}
            formatter={(val: any) => [typeof val === 'number' ? `${val.toFixed(1)}%` : val, 'Score']}
            labelFormatter={(label) => `Week ${label}`}
          />
        )}
        <Line
          type="monotone"
          dataKey="score"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 2, fill: color }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ReportSparkline;
