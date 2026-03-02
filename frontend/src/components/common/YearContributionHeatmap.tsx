import React, { useState, useMemo, useCallback } from 'react';

interface YearHeatmapProps {
  data?: Record<string, number>;
  year?: number;
  title?: string;
  colorScheme?: 'green' | 'blue' | 'purple';
  onCellClick?: (date: string, value: number) => void;
}

interface TooltipData {
  date: string;
  formattedDate: string;
  value: number;
  x: number;
  y: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const YearContributionHeatmap: React.FC<YearHeatmapProps> = ({
  data = {},
  year = new Date().getFullYear(),
  title = 'Contribution Activity',
  colorScheme = 'green',
  onCellClick,
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<number | null>(null);

  const colorSchemes = {
    green: {
      empty: '#1e293b',
      placeholder: '#0f172a',
      levels: ['#064e3b', '#065f46', '#059669', '#10b981', '#34d399'],
    },
    blue: {
      empty: '#1e293b',
      placeholder: '#0f172a',
      levels: ['#1e3a5f', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa'],
    },
    purple: {
      empty: '#1e293b',
      placeholder: '#0f172a',
      levels: ['#3b0764', '#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa'],
    },
  };

  const colors = colorSchemes[colorScheme];

  const { weeks, monthPositions } = useMemo(() => {
    const weeks: { date: Date; value: number; isCurrentYear: boolean }[][] = [];
    const monthPositions: { month: string; weekIndex: number }[] = [];

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const firstSunday = new Date(startDate);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    let currentDate = new Date(firstSunday);
    let currentWeek: { date: Date; value: number; isCurrentYear: boolean }[] = [];
    let weekIndex = 0;
    let lastMonth = -1;

    while (currentDate <= endDate || currentWeek.length > 0) {
      const month = currentDate.getMonth();
      const isCurrentYear = currentDate.getFullYear() === year;

      if (month !== lastMonth) {
        monthPositions.push({ month: MONTHS[month], weekIndex });
        lastMonth = month;
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      const value = data[dateStr] || 0;

      currentWeek.push({
        date: new Date(currentDate),
        value,
        isCurrentYear,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }

      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate > endDate && currentWeek.length > 0 && currentWeek.length < 7) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: new Date(currentDate),
            value: -1,
            isCurrentYear: false,
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(currentWeek);
      }
    }

    return { weeks, monthPositions };
  }, [data, year]);

  const getColor = useCallback((value: number, isCurrentYear: boolean): string => {
    if (value === -1) return colors.placeholder;
    if (!isCurrentYear) return colors.placeholder;
    if (value === 0) return colors.empty;
    if (value <= 2) return colors.levels[0];
    if (value <= 5) return colors.levels[1];
    if (value <= 8) return colors.levels[2];
    if (value <= 12) return colors.levels[3];
    return colors.levels[4];
  }, [colors]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleMouseEnter = (date: Date, value: number, isCurrentYear: boolean, event: React.MouseEvent) => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10;
      
      const tooltipWidth = 150;
      const tooltipHeight = 60;
      
      if (x + tooltipWidth / 2 > viewportWidth) {
        x = rect.right - tooltipWidth / 2 - 5;
      } else if (x - tooltipWidth / 2 < 0) {
        x = tooltipWidth / 2 + 5;
      }
      
      if (y - tooltipHeight < 0) {
        y = rect.bottom + 10;
      }

      const displayValue = value === -1 ? 'No data' : (value === 0 ? 'No activity' : `${value} contribution${value !== 1 ? 's' : ''}`);

      setTooltip({
        date: date.toISOString().split('T')[0],
        formattedDate: formatDate(date),
        value,
        x,
        y,
      });
    }, 100);

    setTooltipTimeout(timeoutId);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    const timeoutId = window.setTimeout(() => {
      setTooltip(null);
    }, 150);
    setTooltipTimeout(timeoutId);
  };

  const handleClick = (date: Date, value: number, isCurrentYear: boolean) => {
    if (onCellClick && isCurrentYear && value >= 0) {
      onCellClick(date.toISOString().split('T')[0], value);
    }
  };

  return (
    <div className="relative w-full">
      {title && (
        <h3 className="text-sm font-medium text-slate-300 mb-3">
          {title}
        </h3>
      )}

      <div className="flex mb-1 ml-8">
        {monthPositions.map((pos, idx) => (
          <div
            key={idx}
            className="text-xs text-slate-500"
            style={{
              marginLeft: idx === 0 ? pos.weekIndex * 14 : (pos.weekIndex - monthPositions[idx - 1].weekIndex) * 14 - 24,
              position: 'absolute',
            }}
          >
            {pos.month}
          </div>
        ))}
        <div style={{ width: '100%' }} />
      </div>

      <div className="flex">
        <div className="flex flex-col mr-1">
          {DAYS.map((day, idx) => (
            <div
              key={day}
              className="text-xs text-slate-500 h-[12px] leading-[12px] mb-[2px] w-8"
              style={{ visibility: idx % 2 === 1 ? 'visible' : 'hidden' }}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex gap-[2px] overflow-x-auto pb-2">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[2px]">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="w-3 h-3 rounded-sm cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10"
                  style={{ 
                    backgroundColor: getColor(day.value, day.isCurrentYear),
                    border: day.isCurrentYear ? '1px solid rgba(51, 65, 85, 0.5)' : '1px dashed rgba(51, 65, 85, 0.3)',
                    boxShadow: day.value > 0 && day.isCurrentYear ? '0 0 3px rgba(16, 185, 129, 0.2)' : 'none',
                    opacity: day.isCurrentYear ? 1 : 0.4,
                  }}
                  onMouseEnter={(e) => handleMouseEnter(day.date, day.value, day.isCurrentYear, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(day.date, day.value, day.isCurrentYear)}
                  title={day.isCurrentYear ? `${formatDate(day.date)}: ${day.value} contribution${day.value !== 1 ? 's' : ''}` : 'Outside ' + year}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end mt-4 gap-1">
        <span className="text-xs text-slate-500 mr-2">Less</span>
        <div 
          className="w-3 h-3 rounded-sm border border-slate-700/50" 
          style={{ backgroundColor: colors.placeholder }} 
        />
        <div 
          className="w-3 h-3 rounded-sm border border-slate-700/50" 
          style={{ backgroundColor: colors.empty }} 
        />
        <div 
          className="w-3 h-3 rounded-sm border border-slate-700/50" 
          style={{ backgroundColor: colors.levels[0] }} 
        />
        <div 
          className="w-3 h-3 rounded-sm border border-slate-700/50" 
          style={{ backgroundColor: colors.levels[1] }} 
        />
        <div 
          className="w-3 h-3 rounded-sm border border-slate-700/50" 
          style={{ backgroundColor: colors.levels[2] }} 
        />
        <div 
          className="w-3 h-3 rounded-sm border border-slate-700/50" 
          style={{ backgroundColor: colors.levels[3] }} 
        />
        <span className="text-xs text-slate-500 ml-1">More</span>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
      
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
            animation: 'fadeIn 0.15s ease-out forwards',
            maxWidth: '180px',
          }}
        >
          <div className="font-medium text-slate-200">{tooltip.formattedDate}</div>
          <div className="text-slate-400 mt-1">
            {tooltip.value === -1 
              ? 'No data available' 
              : tooltip.value === 0 
                ? 'No activity' 
                : `${tooltip.value} contribution${tooltip.value !== 1 ? 's' : ''}`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default YearContributionHeatmap;
