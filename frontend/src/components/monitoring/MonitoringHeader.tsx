import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMonitoring } from '../../context/MonitoringContext';
import { ChevronDown, Search, Filter } from 'lucide-react';

interface MonitoringHeaderProps {
    title: string;
    subtitle?: string;
    showSearch?: boolean;
    onSearchChange?: (query: string) => void;
}

const MonitoringHeader: React.FC<MonitoringHeaderProps> = ({ title, subtitle, showSearch, onSearchChange }) => {
    const { user } = useAuth();
    const { selectedInternId: selectedIntern, setSelectedInternId: setSelectedIntern, interns } = useMonitoring();
    const [showInternDropdown, setShowInternDropdown] = useState(false);

    const getSelectedInternName = (): string => {
        if (user?.role === 'INTERN') return user.full_name || user.email;
        const selected = interns.find(i => i.id === selectedIntern);
        return selected?.full_name || selected?.email || 'Select Intern';
    };

    const getGradient = (name: string): string => {
        const colors = [
            'from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500',
            'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500',
            'from-yellow-500 to-orange-500', 'from-red-500 to-pink-500'
        ];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    const getInitials = (name: string | null): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="bg-[var(--card-bg)] border-b border-[var(--border-color)] px-6 py-6 backdrop-blur-3xl overflow-visible z-30 relative rounded-2xl mx-6 mt-6 glass-card">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 overflow-visible">
                <div className="flex-1">
                    <h1 className="text-3xl font-heading font-black tracking-tighter text-[var(--text-main)] uppercase leading-none mb-2">
                         <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{title}</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-dim)]">{subtitle || 'Status: Active Intelligence'}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto overflow-visible">
                    {showSearch && (
                        <div className="relative group flex-1 sm:w-64 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-purple-400 transition-colors" size={16} />
                            <input 
                                type="text"
                                placeholder="Search data..."
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                className="w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 transition-all"
                            />
                        </div>
                    )}

                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="relative z-30 min-w-[200px]">
                            <button
                                onClick={() => setShowInternDropdown(!showInternDropdown)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/50 transition-all group"
                            >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:scale-105 transition-transform`}>
                                    {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                </div>
                                <span className="text-[var(--text-main)] font-bold text-sm truncate flex-1 text-left">{getSelectedInternName()}</span>
                                <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${showInternDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showInternDropdown && (
                                <>
                                    <div className="fixed inset-0 z-[100]" onClick={() => setShowInternDropdown(false)} />
                                    <div className="absolute top-full right-0 mt-3 w-64 bg-[var(--bg-muted)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl z-[101] isolate animate-scale-in p-2">
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {interns.length > 0 ? interns.map((intern) => (
                                                <button
                                                    key={intern.id}
                                                    onClick={() => {
                                                        setSelectedIntern(intern.id);
                                                        setShowInternDropdown(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${selectedIntern === intern.id ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                                                        {getInitials(intern.full_name)}
                                                    </div>
                                                    <div className="text-left truncate">
                                                        <div className="text-sm font-bold truncate">{intern.full_name || 'No Name'}</div>
                                                        <div className="text-[10px] opacity-60 truncate">{intern.email}</div>
                                                    </div>
                                                </button>
                                            )) : (
                                                <div className="p-4 text-center text-xs text-[var(--text-dim)]">No interns available in your department</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonitoringHeader;
