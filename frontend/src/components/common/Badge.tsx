import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'pink' | 'indigo';
    size?: 'sm' | 'md' | 'lg';
    withDot?: boolean;
    pulse?: boolean;
    icon?: React.ReactNode;
    className?: string;
}

const variantClasses = {
    default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
};

const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    purple: 'bg-purple-400',
    pink: 'bg-pink-400',
    indigo: 'bg-indigo-400',
};

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    withDot = false,
    pulse = false,
    icon,
    className = '',
}) => {
    return (
        <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-sm transition-all duration-300 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        >
            {withDot && (
                <span className={`relative flex h-2 w-2`}>
                    {pulse && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColors[variant]} opacity-75`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}></span>
                </span>
            )}
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </span>
    );
};

export default Badge;
