import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
    /** If true, uses indigo accent. Default is purple. */
    accent?: 'purple' | 'indigo' | 'blue' | 'violet';
    id?: string;
    required?: boolean;
}

const ACCENT_MAP = {
    purple: {
        border: 'border-purple-500/50',
        ring: '0 0 0 3px rgba(168,85,247,0.15)',
        hover: 'hover:border-purple-500/30',
        item: 'bg-purple-500/10 text-purple-300',
        hoverItem: 'hover:bg-purple-500/10 hover:text-purple-300',
        icon: 'text-purple-400',
        panel: 'border-purple-500/30',
    },
    indigo: {
        border: 'border-indigo-500/50',
        ring: '0 0 0 3px rgba(99,102,241,0.15)',
        hover: 'hover:border-indigo-500/30',
        item: 'bg-indigo-500/10 text-indigo-300',
        hoverItem: 'hover:bg-indigo-500/10 hover:text-indigo-300',
        icon: 'text-indigo-400',
        panel: 'border-indigo-500/30',
    },
    blue: {
        border: 'border-blue-500/50',
        ring: '0 0 0 3px rgba(59,130,246,0.15)',
        hover: 'hover:border-blue-500/30',
        item: 'bg-blue-500/10 text-blue-300',
        hoverItem: 'hover:bg-blue-500/10 hover:text-blue-300',
        icon: 'text-blue-400',
        panel: 'border-blue-500/30',
    },
    violet: {
        border: 'border-violet-500/50',
        ring: '0 0 0 3px rgba(139,92,246,0.15)',
        hover: 'hover:border-violet-500/30',
        item: 'bg-violet-500/10 text-violet-300',
        hoverItem: 'hover:bg-violet-500/10 hover:text-violet-300',
        icon: 'text-violet-400',
        panel: 'border-violet-500/30',
    },
};

/**
 * A fully themed custom select dropdown that replaces the native <select>.
 * Works on all pages consistently with the dark glassmorphism design system.
 *
 * Usage:
 *   <CustomSelect
 *     options={[{ value: 'AIML', label: 'AI/ML Department' }]}
 *     value={selected}
 *     onChange={setSelected}
 *     placeholder="Choose a department..."
 *     icon={<Building size={16} />}
 *   />
 */
const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option...',
    disabled = false,
    className = '',
    icon,
    accent = 'indigo',
    id,
}) => {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const colors = ACCENT_MAP[accent] || ACCENT_MAP['indigo'];

    const selectedOption = options.find(o => o.value === value);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                left: rect.left + window.scrollX,
                top: rect.bottom + window.scrollY,
                width: rect.width,
            });
        }
    };

    useEffect(() => {
        if (open) {
            updatePosition();
            const handleScroll = (e: Event) => {
                if (panelRef.current && panelRef.current.contains(e.target as Node)) {
                    return; // Ignore scrolls inside the dropdown itself
                }
                updatePosition(); // Keep it attached to the trigger
            };
            const handleResize = () => updatePosition();
            
            window.addEventListener('scroll', handleScroll, true); // true to catch all scroll events
            window.addEventListener('resize', handleResize);
            
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                (!panelRef.current || !panelRef.current.contains(target))
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className={`relative ${className}`} id={id}>
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(prev => !prev)}
                className={`
                    w-full flex items-center gap-2 px-3 py-2.5
                    bg-[var(--bg-muted)] border border-[var(--border-color)]
                    rounded-xl text-sm font-medium transition-all duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${colors.hover}`}
                    ${open ? `${colors.border} bg-[var(--bg-color)]` : ''}
                `}
                style={open ? { boxShadow: colors.ring } : undefined}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {/* Leading Icon */}
                {icon && (
                    <span className={`shrink-0 ${colors.icon}`}>{icon}</span>
                )}

                {/* Label */}
                <span className={`flex-1 text-left truncate ${selectedOption ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                {/* Chevron */}
                <ChevronDown
                    size={15}
                    className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Panel */}
            {open && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'absolute',
                        left: `${coords.left}px`,
                        top: `${coords.top + 6}px`,
                        width: `${coords.width}px`,
                    }}
                    className={`
                        z-[9999]
                        bg-[var(--bg-color)] border ${colors.panel}
                        rounded-xl shadow-2xl shadow-black/50
                        overflow-hidden animate-scale-in
                    `}
                    role="listbox"
                >
                    <div className="py-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                        {options.map(opt => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    disabled={opt.disabled}
                                    onClick={() => {
                                        if (!opt.disabled) {
                                            onChange(opt.value);
                                            setOpen(false);
                                        }
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-4 py-2.5 text-sm
                                        transition-all duration-150 text-left
                                        ${opt.disabled ? 'text-[var(--text-muted)] cursor-not-allowed opacity-50' : ''}
                                        ${isSelected
                                            ? `${colors.item} font-semibold cursor-default`
                                            : `text-[var(--text-main)] ${colors.hoverItem}`
                                        }
                                    `}
                                >
                                    <span>{opt.label}</span>
                                    {isSelected && (
                                        <Check size={14} className="shrink-0 ml-2" />
                                    )}
                                </button>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                                No options available
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CustomSelect;
