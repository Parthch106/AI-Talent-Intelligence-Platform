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
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
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
}) => {
    return (
        <div
            className={`
        bg-white rounded-xl border border-gray-100 shadow-sm
        ${hover ? 'hover:shadow-md transition-all' : ''}
        ${paddingClasses[padding]}
        ${gradient ? `bg-gradient-to-br ${gradient}` : ''}
        ${className}
      `}
        >
            {(title || icon || action) && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="p-2 bg-gray-100 rounded-lg">
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
                            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                        </div>
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
