import React, { useMemo, useState, useEffect } from 'react';

interface HeatmapProps {
  data: Record<string, number>;
  year?: number;
  title?: string;
  colorScheme?: 'green' | 'blue' | 'purple';
  emptyText?: string;
  onCellClick?: (date: string, value: number) => void;
}

interface TooltipData {
  date: string;
  value: number;
  x: number;
  y: number;
}

const ContributionHeatmap: React.FC<HeatmapProps> = ({
  data,
  year = new Date().getFullYear(),
  title = 'Contribution Heatmap',
  colorScheme = 'green',
  emptyText = 'No activity',
  onCellClick,
}) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Dark theme color schemes - using the project's color palette
  const colorSchemes = {
    green: {
      empty: '#1e293b',       // slate-800
      outside: '#0f172a',    // slate-950
      levels: ['#065f46', '#059669', '#10b981', '#34d399'],  // emerald shades
    },
    blue: {
      empty: '#1e293b',       // slate-800
      outside: '#0f172a',    // slate-950
      levels: ['#1e3a5f', '#1e40af', '#3b82f6', '#60a5fa'],  // blue shades
    },
    purple: {
      empty: '#1e293b',       // slate-800
      outside: '#0f172a',    // slate-950
      levels: ['#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa'],  // violet shades
    },
  };

  const colors = colorSchemes[colorScheme];

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate full year calendar data
  const calendarData = useMemo(() => {
    const result: { date: Date; value: number; isCurrentYear: boolean }[][] = [];
    
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
      const week: { date: Date; value: number; isCurrentYear: boolean }[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
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

  const getColor = (item: { value: number; isCurrentYear: boolean }): string => {
    if (!item.isCurrentYear) return colors.outside;
    if (item.value === 0) return colors.empty;
    if (item.value === 1) return colors.levels[0];
    if (item.value <= 3) return colors.levels[1];
    if (item.value <= 5) return colors.levels[2];
    return colors.levels[3];
  };

  const handleMouseEnter = (date: Date, value: number, isCurrentYear: boolean, event: React.MouseEvent) => {
    if (!isCurrentYear || value === 0) return;
    
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    
    // Set delay to prevent flickering
    const timeout = setTimeout(() => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const tooltipWidth = 150;
      const tooltipHeight = 50;
      
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
        value,
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

  const handleClick = (date: Date, value: number, isCurrentYear: boolean) => {
    if (onCellClick && isCurrentYear) {
      const dateStr = date.toISOString().split('T')[0];
      onCellClick(dateStr, value);
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
        {MONTHS.map((month) => (
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
                      opacity: day.isCurrentYear ? 1 : 0.3,
                      border: day.value > 0 && day.isCurrentYear 
                        ? 'none' 
                        : day.isCurrentYear 
                          ? '1px dashed #475569' 
                          : '1px dashed #1e293b',
                      boxShadow: day.value > 0 && day.isCurrentYear 
                        ? `0 0 4px ${colors.levels[Math.min(3, day.value - 1)]}40` 
                        : 'none',
                    }}
                    onMouseEnter={(e) => handleMouseEnter(day.date, day.value, day.isCurrentYear, e)}
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
        <span className="text-xs text-slate-500 mr-2">Less</span>
        <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: colors.empty }} />
        <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: colors.levels[0] }} />
        <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: colors.levels[1] }} />
        <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: colors.levels[2] }} />
        <div className="w-3 h-3 rounded-sm border border-slate-700/50" style={{ backgroundColor: colors.levels[3] }} />
        <span className="text-xs text-slate-500 ml-1">More</span>
      </div>
      
      {/* Tooltip with animation */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 pointer-events-none animate-fadeIn"
          style={{
            left: tooltip.x,
            top: tooltip.y - 45,
            transform: 'translateX(-50%)',
            minWidth: '100px',
          }}
        >
          <div className="font-medium">{tooltip.value} {tooltip.value === 1 ? 'task' : 'tasks'}</div>
          <div className="text-slate-400">{tooltip.date}</div>
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

export default ContributionHeatmap;
