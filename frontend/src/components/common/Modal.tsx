import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
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
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
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
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>
            <div
                className={`relative glass-card w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden animate-modal-enter`}
            >
                <div className={`flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r ${gradientClasses[gradient]}`}>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400 hover:text-white" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] text-slate-200">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
