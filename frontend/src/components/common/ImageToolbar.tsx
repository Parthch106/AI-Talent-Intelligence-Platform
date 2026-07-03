import React, { useEffect, useRef } from 'react';
import { Edit2, Replace, Trash2, X } from 'lucide-react';

interface ImageToolbarProps {
    rect: DOMRect;
    onEdit: () => void;
    onReplace: (file: File) => void;
    onDelete: () => void;
    onClose: () => void;
}

export const ImageToolbar: React.FC<ImageToolbarProps> = ({ rect, onEdit, onReplace, onDelete, onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Calculate absolute position on the screen
    // Use fixed positioning with viewport-relative coordinates from getBoundingClientRect
    const top = rect.top - 50; // 50px above the image
    const left = rect.left + (rect.width / 2);

    const handleReplaceClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onReplace(file);
        }
    };

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'IMG') {
                    onClose();
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={toolbarRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
                position: 'fixed', 
                top: `${top}px`, 
                left: `${left}px`, 
                transform: 'translateX(-50%)',
                zIndex: 99998,
            }}
            className="z-40 flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl px-2 py-1 rounded-xl text-[var(--text-main)]"
        >
            <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--bg-muted)] hover:text-purple-400 rounded-lg text-xs font-semibold transition-colors"
                title="Edit / Crop Image"
            >
                <Edit2 size={13} />
                <span>Edit</span>
            </button>

            <div className="w-[1px] h-4 bg-[var(--border-color)] self-center" />

            <button
                type="button"
                onClick={handleReplaceClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--bg-muted)] hover:text-purple-400 rounded-lg text-xs font-semibold transition-colors"
                title="Replace Image"
            >
                <Replace size={13} />
                <span>Replace</span>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />

            <div className="w-[1px] h-4 bg-[var(--border-color)] self-center" />

            <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold transition-colors"
                title="Delete Image"
            >
                <Trash2 size={13} />
                <span>Delete</span>
            </button>

            <div className="w-[1px] h-4 bg-[var(--border-color)] self-center" />

            <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--bg-muted)] text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg transition-colors"
                title="Close Menu"
            >
                <X size={13} />
            </button>
        </div>
    );
};
