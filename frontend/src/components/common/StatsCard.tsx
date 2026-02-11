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
        <div className={`group relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br ${gradient}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        {icon}
                    </div>
                    <span className="text-white/80 text-sm font-medium">{title}</span>
                </div>
                <p className="text-4xl font-bold">{value}</p>
                {subtitle && <p className="text-white/70 text-sm mt-1">{subtitle}</p>}
                {trend && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-green-200' : 'text-red-200'}`}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
