import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AttendanceData {
  status: string;
  value: number;
  hours: number;
}

interface AttendanceHeatmapProps {
  data: Record<string, AttendanceData>;
  year?: number;
  title?: string;
  onCellClick?: (date: string, data: AttendanceData) => void;
}

interface TooltipData {
  date: string;
  status: string;
  hours: number;
  x: number;
  y: number;
}

// Dark theme status colors
const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#059669',       // emerald-600
  WORK_FROM_HOME: '#10b981', // emerald-500
  LATE: '#eab308',         // yellow-500
  HALF_DAY: '#f97316',     // orange-500
  ABSENT: '#ef4444',        // red-500
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  WORK_FROM_HOME: 'Work From Home',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absent',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({
  data,
  year = new Date().getFullYear(),
  title = 'Attendance Heatmap',
  onCellClick,
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Generate full year calendar data
  const calendarData = useMemo(() => {
    const result: { date: Date; data: AttendanceData | null; isCurrentYear: boolean }[][] = [];
    
    // Start from January 1st of the selected year
    const startDate = new Date(year, 0, 1);
    // Get last day of December for the selected year (handles all months correctly)
    const endDate = new Date(year + 1, 0, 0);
    
    // Adjust to start from the first Sunday before or on Jan 1
    const calendarStart = new Date(startDate);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
    
    // Adjust to end on the last Saturday after or on Dec 31
    const calendarEnd = new Date(endDate);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));
    
    const currentDate = new Date(calendarStart);
    
    while (currentDate <= calendarEnd) {
      const week: { date: Date; data: AttendanceData | null; isCurrentYear: boolean }[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const isCurrentYear = currentDate.getFullYear() === year;
        
        week.push({
          date: new Date(currentDate),
          data: isCurrentYear ? (data[dateStr] || null) : null,
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

  const getColor = (item: { data: AttendanceData | null; isCurrentYear: boolean }): string => {
    if (!item.isCurrentYear) return 'transparent';
    if (!item.data) return 'var(--bg-muted)'; 
    return STATUS_COLORS[item.data.status] || 'var(--bg-muted)';
  };

  const handleMouseEnter = (date: Date, attendanceData: AttendanceData | null, isCurrentYear: boolean, event: React.MouseEvent) => {
    if (!attendanceData || !isCurrentYear) {
      setTooltip(null);
      return;
    }
    
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    setTooltip({
      date: formattedDate,
      status: STATUS_LABELS[attendanceData.status] || attendanceData.status,
      hours: attendanceData.hours,
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

  const handleClick = (date: Date, attendanceData: AttendanceData | null, isCurrentYear: boolean) => {
    if (onCellClick && attendanceData && isCurrentYear) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      onCellClick(dateStr, attendanceData);
    }
  };

  return (
    <div className="relative p-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)]" ref={containerRef}>
      {title && (
        <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 uppercase tracking-wider">
          {title}
        </h3>
      )}
      
      <div className="flex">
        {/* Day labels column — fixed, does not scroll */}
        <div className="flex flex-col mr-2 w-8 mt-5 shrink-0">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-[10px] text-[var(--text-muted)] font-bold leading-3 mb-0.5 uppercase tracking-tighter"
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
                className="absolute text-[10px] font-bold text-[var(--text-muted)] uppercase"
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
                      border: day.data && day.isCurrentYear
                        ? 'none'
                        : day.isCurrentYear
                          ? '1px dashed var(--border-color)'
                          : '1px dashed transparent',
                      boxShadow: day.data && day.isCurrentYear
                        ? `0 0 4px ${STATUS_COLORS[day.data.status] || '#000'}40`
                        : 'none',
                      opacity: day.isCurrentYear ? 1 : 0.3,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(day.date, day.data, day.isCurrentYear, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(day.date, day.data, day.isCurrentYear)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end mt-3 gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: STATUS_COLORS.PRESENT }} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Present</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: STATUS_COLORS.WORK_FROM_HOME }} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">WFH</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: STATUS_COLORS.LATE }} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: STATUS_COLORS.HALF_DAY }} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Half Day</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-[var(--border-color)]" style={{ backgroundColor: STATUS_COLORS.ABSENT }} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-dashed border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-muted)' }} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">No record</span>
        </div>
      </div>
      
      {/* Tooltip with animation - Using Portal to avoid clipping */}
      {tooltip && createPortal(
        <div
          className="fixed z-[9999] bg-[var(--card-bg)] text-[var(--text-main)] text-xs px-3 py-2 rounded-lg shadow-xl border border-[var(--border-color)] pointer-events-none animate-fadeIn backdrop-blur-md"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 15,
            transform: 'translateY(-100%)',
            minWidth: '120px',
          }}
        >
          <div className="font-bold uppercase tracking-tight">{tooltip.status}</div>
          <div className="text-[var(--text-dim)] font-medium mt-1">{tooltip.date} • {tooltip.hours}h</div>
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

export default AttendanceHeatmap;
