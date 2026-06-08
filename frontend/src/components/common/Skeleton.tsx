import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
    className = '', 
    variant = 'rectangular',
    width,
    height 
}) => {
    const baseClasses = 'animate-pulse bg-[var(--bg-muted)]';
    const variantClasses = {
        text: 'rounded h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-lg'
    };

    return (
        <div 
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={{
                width: width || '100%',
                height: height || (variant === 'text' ? '1rem' : 'auto')
            }}
        />
    );
};

export const TaskCardSkeleton = () => (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[32px] overflow-hidden p-8">
        <div className="flex justify-between items-start mb-6">
            <div className="space-y-2">
                <Skeleton width={60} height={12} />
                <div className="flex gap-2">
                    <Skeleton width={50} height={20} />
                    <Skeleton width={50} height={20} />
                </div>
            </div>
            <Skeleton width={100} height={32} variant="rectangular" />
        </div>
        <Skeleton width="80%" height={24} className="mb-4" />
        <Skeleton width="60%" height={16} className="mb-6" />
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={28} />
        </div>
    </div>
);

export const TaskListSkeleton = () => (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-4">
        <Skeleton width={20} height={20} variant="circular" />
        <Skeleton width={60} height={16} />
        <div className="flex-1">
            <Skeleton width="70%" height={16} className="mb-2" />
            <Skeleton width="40%" height={12} />
        </div>
        <Skeleton width={100} height={32} />
    </div>
);

export const StatsCardSkeleton = () => (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6">
        <div className="flex flex-col items-center text-center">
            <Skeleton width={40} height={40} variant="circular" className="mb-3" />
            <Skeleton width={50} height={32} className="mb-2" />
            <Skeleton width={80} height={14} />
        </div>
    </div>
);

export default Skeleton;
