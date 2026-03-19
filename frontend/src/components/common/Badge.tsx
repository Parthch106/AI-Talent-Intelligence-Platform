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
    default: 'bg-[var(--bg-muted)] text-[var(--text-dim)] border-[var(--border-color)]',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-sm shadow-red-500/5',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/5',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shadow-sm shadow-purple-500/5',
    pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 shadow-sm shadow-pink-500/5',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5',
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-[8px] tracking-widest',
    md: 'px-3 py-1 text-[9px] tracking-[0.15em]',
    lg: 'px-4 py-1.5 text-[10px] tracking-[0.2em]',
};

const dotColors = {
    default: 'bg-slate-500',
    success: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    danger: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    info: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    purple: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    pink: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]',
    indigo: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
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
