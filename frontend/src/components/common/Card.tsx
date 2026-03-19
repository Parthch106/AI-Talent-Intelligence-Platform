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
    default: 'glass-card border-[var(--border-color)]',
    gradient: 'bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 border-purple-500/20',
    outlined: 'bg-transparent border-[var(--border-color)] hover:border-purple-500/20',
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
                relative overflow-hidden rounded-3xl border transition-all duration-500
                ${variantStyles[variant]}
                ${hover ? 'cursor-pointer hover:border-purple-500/30 hover:bg-[var(--card-bg)] hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] hover:-translate-y-1' : ''}
                ${paddingClasses[padding]}
                ${gradient ? `bg-gradient-to-br ${gradient}` : ''}
                ${glow ? 'shadow-lg shadow-purple-500/20' : ''}
                ${className}
                animate-fade-in
            `}
        >
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/[0.03] blur-[100px] rounded-full pointer-events-none"></div>

            {/* Content */}
            <div className="relative z-10">
                {(title || icon || action) && (
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {icon && (
                                <div className="p-3 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] shadow-xl group/card-icon transition-all duration-500 hover:border-purple-500/30">
                                    <div className="text-purple-400 group-hover/card-icon:scale-110 transition-transform">
                                        {icon}
                                    </div>
                                </div>
                            )}
                            <div>
                                {title && <h3 className="font-heading font-black tracking-tighter text-[var(--text-main)] text-xl uppercase italic leading-none">{title}</h3>}
                                {subtitle && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] mt-1.5">{subtitle}</p>}
                            </div>
                        </div>
                        {action && <div className="relative z-20">{action}</div>}
                    </div>
                )}
                <div className="text-[var(--text-dim)] leading-relaxed">
                    {children}
                </div>
            </div>

            {/* Subtle accent border at bottom */}
            <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
        </div>
    );
};

export default Card;
