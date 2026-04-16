import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HeatmapProps {
  data: Record<string, number>;
  year?: number;
  title?: string;
  colorScheme?: 'green' | 'blue' | 'purple';
  onCellClick?: (date: string, value: number) => void;
}

interface TooltipData {
  date: string;
  value: number;
  x: number;
  y: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ContributionHeatmap: React.FC<HeatmapProps> = ({
  data,
  year = new Date().getFullYear(),
  title = 'Contribution Heatmap',
  colorScheme = 'green',
  onCellClick,
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Theme-aware color schemes
  const colorSchemes = {
    green: {
      empty: 'var(--bg-muted)',
      outside: 'var(--bg-color)',
      levels: ['#065f46', '#059669', '#10b981', '#34d399'],  // emerald shades
    },
    blue: {
      empty: 'var(--bg-muted)',
      outside: 'var(--bg-color)',
      levels: ['#1e3a5f', '#1e40af', '#3b82f6', '#60a5fa'],  // blue shades
    },
    purple: {
      empty: 'var(--bg-muted)',
      outside: 'var(--bg-color)',
      levels: ['#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa'],  // violet shades
    },
  };

  const colors = colorSchemes[colorScheme];



  // Generate full year calendar data
  const calendarData = useMemo(() => {
    const result: { date: Date; value: number; isCurrentYear: boolean }[][] = [];
    
    // Start from January 1st of the selected year
    const startDate = new Date(year, 0, 1);
    // Get last day of December for the selected year
    const endDate = new Date(year + 1, 0, 0);
    
    // Adjust to start from the first Sunday before or on Jan 1
    const calendarStart = new Date(startDate);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
    
    // Adjust to end on the last Saturday after or on Dec 31
    const calendarEnd = new Date(endDate);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));
    
    const currentDate = new Date(calendarStart);
    
    while (currentDate <= calendarEnd) {
      const week: { date: Date; value: number; isCurrentYear: boolean }[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const isCurrentYear = currentDate.getFullYear() === year;
        
        week.push({
          date: new Date(currentDate),
          value: isCurrentYear ? (data[dateStr] || 0) : 0,
          isCurrentYear,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      result.push(week);
    }
    
    return result;
  }, [data, year]);

  // Compute the week index at which each month label should appear
  const monthLabelPositions = useMemo(() => {
    const positions: { month: string; weekIndex: number }[] = [];
    const seen = new Set<number>();
    calendarData.forEach((week, weekIdx) => {
      // Use the first day-of-year cell in this week to determine the month
      const firstCurrentDay = week.find(d => d.isCurrentYear);
      if (firstCurrentDay) {
        const month = firstCurrentDay.date.getMonth();
        if (!seen.has(month)) {
          seen.add(month);
          positions.push({ month: MONTHS[month], weekIndex: weekIdx });
        }
      }
    });
    return positions;
  }, [calendarData]);

  // Measure container width with ResizeObserver
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute cell size + gap so all weeks fill the container exactly
  const { cellSize, gap } = useMemo(() => {
    const totalWeeks = calendarData.length;
    if (totalWeeks === 0 || containerWidth === 0) return { cellSize: 12, gap: 2 };
    const g = 2;
    // cellSize = (containerWidth - gap*(totalWeeks-1)) / totalWeeks
    const cs = Math.max(4, (containerWidth - g * (totalWeeks - 1)) / totalWeeks);
    return { cellSize: cs, gap: g };
  }, [calendarData.length, containerWidth]);

  // stride between week columns in px
  const weekStride = cellSize + gap;

  const getColor = (item: { value: number; isCurrentYear: boolean }): string => {
    if (!item.isCurrentYear) return colors.outside;
    if (item.value === 0) return colors.empty;
    if (item.value === 1) return colors.levels[0];
    if (item.value <= 3) return colors.levels[1];
    if (item.value <= 5) return colors.levels[2];
    return colors.levels[3];
  };

  const handleMouseEnter = (date: Date, count: number, isCurrentYear: boolean, event: React.MouseEvent) => {
    if (!isCurrentYear || count === 0) return;
    
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    setTooltip({
      date: formattedDate,
      value: count,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltip) {
      setTooltip(prev => prev ? {
        ...prev,
        x: event.clientX,
        y: event.clientY,
      } : null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleClick = (date: Date, value: number, isCurrentYear: boolean) => {
    if (onCellClick && isCurrentYear) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      onCellClick(dateStr, value);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    const currentTimeout = hoverTimeoutRef.current;
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  return (
    <div className="relative p-3 bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)]">
      {title && (
        <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">
          {title}
        </h3>
      )}
      
      <div className="flex">
        {/* Day labels column — fixed, does not scroll */}
        <div className="flex flex-col mr-2 w-8 mt-5 shrink-0">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-xs text-[var(--text-muted)] leading-3 mb-0.5"
              style={{ height: `${cellSize}px`, lineHeight: `${cellSize}px` }}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid area — fills remaining width, no scroll */}
        <div className="flex-1 min-w-0" ref={gridContainerRef}>
          {/* Month labels pinned to actual week columns */}
          <div className="relative mb-1" style={{ height: '16px' }}>
            {monthLabelPositions.map(({ month, weekIndex }) => (
              <span
                key={month}
                className="absolute text-xs text-[var(--text-muted)]"
                style={{ left: `${weekIndex * weekStride}px` }}
              >
                {month}
              </span>
            ))}
          </div>

          {/* Heatmap grid */}
          <div style={{ display: 'flex', gap: `${gap}px` }}>
            {calendarData.map((week, weekIdx) => (
              <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="rounded-sm cursor-pointer transition-all duration-150 hover:scale-125"
                    style={{ 
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      backgroundColor: getColor(day),
                      opacity: day.isCurrentYear ? 1 : 0.3,
                      border: day.value > 0 && day.isCurrentYear 
                        ? 'none' 
                        : day.isCurrentYear 
                          ? '1px dashed var(--border-color)' 
                          : '1px dashed var(--bg-muted)',
                      boxShadow: day.value > 0 && day.isCurrentYear 
                        ? `0 0 4px ${colors.levels[Math.min(3, day.value - 1)]}40` 
                        : 'none',
                    }}
                    onMouseEnter={(e) => handleMouseEnter(day.date, day.value, day.isCurrentYear, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(day.date, day.value, day.isCurrentYear)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end mt-3 gap-1">
        <span className="text-xs text-[var(--text-muted)] mr-2">Less</span>
        <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: colors.empty }} />
        <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: colors.levels[0] }} />
        <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: colors.levels[1] }} />
        <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: colors.levels[2] }} />
        <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: colors.levels[3] }} />
        <span className="text-xs text-[var(--text-muted)] ml-1">More</span>
      </div>
      
      {/* Tooltip with animation - Using Portal to avoid clipping */}
      {tooltip && createPortal(
        <div
          className="fixed z-[9999] bg-[var(--card-bg)] text-[var(--text-main)] text-xs px-3 py-2 rounded-lg shadow-xl border border-[var(--border-color)] pointer-events-none animate-fadeIn"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 15,
            transform: 'translateY(-100%)',
            minWidth: '100px',
            backgroundColor: 'var(--card-bg)', // Extra safety for portal
          }}
        >
          <div className="font-medium">{tooltip.value} {tooltip.value === 1 ? 'task' : 'tasks'}</div>
          <div className="text-[var(--text-dim)]">{tooltip.date}</div>
        </div>,
        document.body
      )}
      
      {/* Add fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-95%);
          }
          to {
            opacity: 1;
            transform: translateY(-100%);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ContributionHeatmap;
