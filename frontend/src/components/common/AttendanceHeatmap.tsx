import React, { useMemo, useState, useEffect } from 'react';

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
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Generate full year calendar data
  const calendarData = useMemo(() => {
    const result: { date: Date; data: AttendanceData | null; isCurrentYear: boolean }[][] = [];
    
    // Start from January 1st of the selected year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Adjust to start from the first Sunday before or on Jan 1
    const calendarStart = new Date(startDate);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
    
    // Adjust to end on the last Saturday after or on Dec 31
    const calendarEnd = new Date(endDate);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));
    
    let currentDate = new Date(calendarStart);
    
    while (currentDate <= calendarEnd) {
      const week: { date: Date; data: AttendanceData | null; isCurrentYear: boolean }[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
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

  const getColor = (item: { data: AttendanceData | null; isCurrentYear: boolean }): string => {
    if (!item.isCurrentYear) return '#0f172a'; // slate-950 for outside year
    if (!item.data) return '#1e293b'; // slate-800 for no data
    return STATUS_COLORS[item.data.status] || '#1e293b';
  };

  const handleMouseEnter = (date: Date, attendanceData: AttendanceData | null, isCurrentYear: boolean, event: React.MouseEvent) => {
    if (!attendanceData || !isCurrentYear) return;
    
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    
    // Set delay to prevent flickering
    const timeout = setTimeout(() => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const tooltipWidth = 160;
      const tooltipHeight = 60;
      
      // Calculate position with viewport bounds checking
      let x = rect.left + rect.width / 2;
      let y = rect.top;
      
      // Ensure tooltip stays within viewport
      if (x - tooltipWidth / 2 < 10) {
        x = tooltipWidth / 2 + 10;
      } else if (x + tooltipWidth / 2 > window.innerWidth - 10) {
        x = window.innerWidth - tooltipWidth / 2 - 10;
      }
      
      if (y - tooltipHeight - 10 < 10) {
        y = rect.bottom + 10;
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
        x,
        y,
      });
    }, 100);
    
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setTooltip(null);
  };

  const handleClick = (date: Date, attendanceData: AttendanceData | null, isCurrentYear: boolean) => {
    if (onCellClick && attendanceData && isCurrentYear) {
      const dateStr = date.toISOString().split('T')[0];
      onCellClick(dateStr, attendanceData);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  return (
    <div className="relative p-3 bg-slate-800 rounded-lg border border-slate-700">
      {title && (
        <h3 className="text-sm font-medium text-slate-300 mb-3">
          {title}
        </h3>
      )}
      
      {/* Month labels */}
      <div className="flex mb-2 ml-10">
        {MONTHS.map((month, idx) => (
          <div
            key={month}
            className="text-xs text-slate-500"
            style={{
              width: `${100 / 12}%`,
              textAlign: 'center' as const,
            }}
          >
            {month}
          </div>
        ))}
      </div>
      
      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col mr-2 w-8">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-xs text-slate-500 h-3 leading-3 mb-0.5"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Heatmap grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-0.5">
            {calendarData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-0.5">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="w-3 h-3 rounded-sm cursor-pointer transition-all duration-150 hover:scale-125 border border-slate-700/50"
                    style={{ 
                      backgroundColor: getColor(day),
                      border: day.data && day.isCurrentYear 
                        ? 'none' 
                        : day.isCurrentYear 
                          ? '1px dashed #475569' 
                          : '1px dashed #1e293b',
                      boxShadow: day.data && day.isCurrentYear 
                        ? `0 0 4px ${STATUS_COLORS[day.data.status] || '#000'}40` 
                        : 'none',
                      opacity: day.isCurrentYear ? 1 : 0.3,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(day.date, day.data, day.isCurrentYear, e)}
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
          <span className="text-xs text-slate-500">Present</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: STATUS_COLORS.WORK_FROM_HOME }} />
          <span className="text-xs text-slate-500">WFH</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: STATUS_COLORS.LATE }} />
          <span className="text-xs text-slate-500">Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: STATUS_COLORS.HALF_DAY }} />
          <span className="text-xs text-slate-500">Half Day</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: STATUS_COLORS.ABSENT }} />
          <span className="text-xs text-slate-500">Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm border border-dashed border-slate-600" style={{ backgroundColor: '#1e293b' }} />
          <span className="text-xs text-slate-500">No record</span>
        </div>
      </div>
      
      {/* Tooltip with animation */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 pointer-events-none animate-fadeIn"
          style={{
            left: tooltip.x,
            top: tooltip.y - 45,
            transform: 'translateX(-50%)',
            minWidth: '120px',
          }}
        >
          <div className="font-medium">{tooltip.status}</div>
          <div className="text-slate-400">{tooltip.date} • {tooltip.hours}h</div>
        </div>
      )}
      
      {/* Add fade-in animation */}
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
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AttendanceHeatmap;
