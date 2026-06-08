import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-[60vh] w-full">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="text-[var(--text-dim)] font-black uppercase text-[10px] tracking-widest animate-pulse">Initializing Interface...</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
