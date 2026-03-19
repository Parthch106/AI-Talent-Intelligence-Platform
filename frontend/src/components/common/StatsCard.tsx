import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    gradient,
    trend,
}) => {
    return (
        <div className={`group relative overflow-hidden rounded-[2rem] p-8 text-[var(--text-main)] transition-all duration-500 hover:-translate-y-2 bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-purple-500/30 glass-card`}>
            {/* Animated background glow */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${gradient} opacity-10 blur-[80px] group-hover:opacity-20 transition-opacity duration-700`}></div>
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-gradient-to-br ${gradient} bg-opacity-10 rounded-2xl border border-[var(--border-color)] group-hover:scale-110 transition-transform duration-500 shadow-xl`}>
                            <div className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                {icon}
                            </div>
                        </div>
                        <span className="text-[var(--text-dim)] text-[10px] font-black uppercase tracking-[0.25em]">{title}</span>
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${trend.isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col">
                    <h3 className="text-5xl font-heading font-black tracking-tighter text-[var(--text-main)] italic drop-shadow-2xl">
                        {value}
                    </h3>
                    {subtitle && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] mt-2">{subtitle}</p>}
                </div>
            </div>

            {/* Bottom accent line */}
            <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-500`}></div>
        </div>
    );
};

export default StatsCard;
