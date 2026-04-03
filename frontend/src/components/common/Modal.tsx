import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
    gradient?: 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}

const gradientClasses = {
    purple: 'from-purple-500/20 via-pink-500/10 to-indigo-500/20',
    blue: 'from-blue-500/20 via-cyan-500/10 to-indigo-500/20',
    emerald: 'from-emerald-500/20 via-green-500/10 to-teal-500/20',
    amber: 'from-amber-500/20 via-orange-500/10 to-red-500/20',
    rose: 'from-rose-500/20 via-pink-500/10 to-red-500/20',
    violet: 'from-violet-500/20 via-purple-500/10 to-pink-500/20',
};

const sizeClasses = {
    sm: 'max-w-md',        // 28rem
    md: 'max-w-xl',        // 36rem
    lg: 'max-w-2xl',       // 42rem
    xl: 'max-w-4xl',       // 56rem
    '2xl': 'max-w-6xl',    // 72rem
    '3xl': 'max-w-7xl',    // 80rem
    full: 'max-w-[95vw]',
};

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    gradient = 'purple',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[#050510]/80 backdrop-blur-md"
                onClick={onClose}
            ></div>
            <div
                className={`relative glass-card w-full ${sizeClasses[size]} max-h-[85vh] overflow-hidden animate-modal-enter shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10`}
            >
                <div className={`flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r ${gradientClasses[gradient]}`}>
                    <h2 className="text-xl font-heading font-black tracking-tighter text-white uppercase">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10 group"
                    >
                        <X size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto max-h-[calc(85vh-88px)] text-slate-300 leading-relaxed font-sans custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
