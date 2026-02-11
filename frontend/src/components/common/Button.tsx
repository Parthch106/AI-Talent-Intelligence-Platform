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
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    gradient?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    fullWidth?: boolean;
}

const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
};

const gradientClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg',
    emerald: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg',
    violet: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg',
    rose: 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md hover:shadow-lg',
    slate: 'bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white shadow-md hover:shadow-lg',
};

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
};

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    gradient,
    icon,
    iconPosition = 'left',
    loading = false,
    fullWidth = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const classes = [
        baseClasses,
        gradient ? gradientClasses[gradient] : variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
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
                <span className="mr-2">{icon}</span>
            ) : null}
            {children}
            {icon && iconPosition === 'right' && !loading && (
                <span className="ml-2">{icon}</span>
            )}
        </button>
    );
};

export default Button;
