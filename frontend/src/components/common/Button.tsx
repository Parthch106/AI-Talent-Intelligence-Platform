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
    primary: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:border-white/20',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/20',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
    outline: 'bg-transparent border border-purple-500/30 text-purple-400 hover:bg-purple-500/5 hover:border-purple-500',
};

const gradientClasses = {
    purple: 'bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]',
    blue: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]',
    emerald: 'bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]',
    amber: 'bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    rose: 'bg-gradient-to-r from-rose-600 via-pink-500 to-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.4)]',
    slate: 'bg-gradient-to-r from-slate-600 via-gray-500 to-zinc-500 text-white shadow-[0_0_20px_rgba(71,85,105,0.3)]',
    indigo: 'bg-gradient-to-r from-indigo-600 via-purple-500 to-violet-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]',
};

const sizeClasses = {
    sm: 'px-4 py-2 text-xs rounded-xl tracking-wider',
    md: 'px-6 py-3 text-sm rounded-2xl tracking-widest',
    lg: 'px-8 py-4 text-base rounded-2xl tracking-[0.15em]',
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
    const baseClasses = 'inline-flex items-center justify-center font-black uppercase transition-all duration-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 group overflow-hidden relative';
    
    // Add a shimmer effect to premium buttons
    const shimmerEffect = (gradient || variant === 'primary') ? 'after:content-[""] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-1000' : '';

    const classes = [
        baseClasses,
        gradient ? gradientClasses[gradient] : variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        shimmerEffect,
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
