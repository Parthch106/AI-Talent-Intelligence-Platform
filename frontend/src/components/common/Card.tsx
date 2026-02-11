import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    gradient?: string;
    icon?: React.ReactNode;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    glow?: boolean;
    variant?: 'default' | 'gradient' | 'outlined';
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
};

const variantStyles = {
    default: 'bg-slate-800/30 border-white/5',
    gradient: 'bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10 border-purple-500/20',
    outlined: 'bg-transparent border-slate-700',
};

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    hover = false,
    padding = 'md',
    gradient,
    icon,
    title,
    subtitle,
    action,
    glow = false,
    variant = 'default',
}) => {
    return (
        <div
            className={`
                relative overflow-hidden rounded-2xl border backdrop-blur-xl
                ${variantStyles[variant]}
                ${hover ? 'cursor-pointer transition-all duration-300 hover:border-purple-500/30 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1' : ''}
                ${paddingClasses[padding]}
                ${gradient ? `bg-gradient-to-br ${gradient}` : ''}
                ${glow ? 'shadow-lg shadow-purple-500/20' : ''}
                ${className}
                animate-fade-in
            `}
        >
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10">
                {(title || icon || action) && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/20 shadow-lg shadow-purple-500/10">
                                    <div className="text-purple-400">
                                        {icon}
                                    </div>
                                </div>
                            )}
                            <div>
                                {title && <h3 className="font-semibold text-white text-lg">{title}</h3>}
                                {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
                            </div>
                        </div>
                        {action}
                    </div>
                )}
                {children}
            </div>

            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
        </div>
    );
};

export default Card;
