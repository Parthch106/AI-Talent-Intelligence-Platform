import React from 'react';
import {
    Plus, X, CheckCircle, Clock, AlertTriangle, Home,
    Calendar, TrendingUp, FileText, Users, Target, ChevronRight,
    Briefcase, Award, BarChart2, Settings, Bell, LayoutDashboard,
    FolderKanban, Brain, Monitor, MessageSquare, Loader2
} from 'lucide-react';

// Icon exports for easy access
export const Icons = {
    Plus, X, CheckCircle, Clock, AlertTriangle, Home,
    Calendar, TrendingUp, FileText, Users, Target, ChevronRight,
    Briefcase, Award, BarChart2, Settings, Bell, LayoutDashboard,
    FolderKanban, Brain, Monitor, MessageSquare, Loader2,
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    gradient?: 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    fullWidth?: boolean;
    glow?: boolean;
}

const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white',
    secondary: 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 border border-slate-700 hover:border-slate-600',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white',
    outline: 'bg-transparent border-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500',
};

const gradientClasses = {
    purple: 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]',
    blue: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]',
    emerald: 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]',
    amber: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]',
    rose: 'bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98]',
    slate: 'bg-gradient-to-r from-slate-500 via-gray-500 to-zinc-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-slate-500/25 hover:shadow-slate-500/40 hover:scale-[1.02] active:scale-[0.98]',
    indigo: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]',
};

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
};

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    gradient,
    icon,
    iconPosition = 'left',
    loading = false,
    fullWidth = false,
    glow = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';
    const glowClasses = glow ? 'hover:animate-glow' : '';

    const classes = [
        baseClasses,
        gradient ? gradientClasses[gradient] : variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        glowClasses,
        className,
    ].join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Icons.Loader2 size={18} className="animate-spin mr-2" />
            ) : icon && iconPosition === 'left' ? (
                <span className="mr-2 transition-transform group-hover:translate-x-0.5">{icon}</span>
            ) : null}
            {children}
            {icon && iconPosition === 'right' && !loading && (
                <span className="ml-2 transition-transform group-hover:translate-x-0.5">{icon}</span>
            )}
        </button>
    );
};

export default Button;
