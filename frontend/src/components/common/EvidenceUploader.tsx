import React, { useState, useRef } from 'react';
import { Upload, X, Paperclip, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import Badge from './Badge';

interface EvidenceUploaderProps {
    onUploadComplete: (documentIds: number[]) => void;
    documentType?: string;
    label?: string;
    maxSizeMB?: number;
}

interface UploadingFile {
    name: string;
    size: number;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    id?: number;
    errorMsg?: string;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
    onUploadComplete,
    documentType = 'OTHER',
    label = 'evidence',
    maxSizeMB = 10
}) => {
    const [files, setFiles] = useState<UploadingFile[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFiles = async (selectedFiles: FileList) => {
        const newFiles = Array.from(selectedFiles);
        const uploadedIds: number[] = [];

        // Filter by size
        const validFiles = newFiles.filter(file => {
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > maxSizeMB) {
                setFiles(prev => [...prev, {
                    name: file.name,
                    size: file.size,
                    progress: 0,
                    status: 'error',
                    errorMsg: `File exceeds limit of ${maxSizeMB}MB`
                }]);
                return false;
            }
            return true;
        });

        // Add uploading states
        const initialStates = validFiles.map(file => ({
            name: file.name,
            size: file.size,
            progress: 10,
            status: 'uploading' as const
        }));
        setFiles(prev => [...prev, ...initialStates]);

        // Upload files sequentially
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', documentType);
            formData.append('title', file.name);

            try {
                const res = await api.post('/documents/files/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total
                            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            : 50;
                        setFiles(prev => prev.map(f =>
                            f.name === file.name ? { ...f, progress: Math.max(f.progress, progress) } : f
                        ));
                    }
                });

                uploadedIds.push(res.data.id);
                setFiles(prev => prev.map(f =>
                    f.name === file.name ? { ...f, status: 'success', progress: 100, id: res.data.id } : f
                ));
            } catch (err) {
                setFiles(prev => prev.map(f =>
                    f.name === file.name ? { ...f, status: 'error', errorMsg: 'Upload failed' } : f
                ));
            }
        }

        // Notify parent with all completed uploads
        const finalSuccessfulIds = files
            .filter(f => f.status === 'success' && f.id)
            .map(f => f.id!)
            .concat(uploadedIds);
        onUploadComplete(finalSuccessfulIds);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFiles(e.target.files);
        }
    };

    const removeFile = (index: number) => {
        const fileToRemove = files[index];
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);

        // Notify parent of updated success lists
        const successfulIds = updatedFiles
            .filter(f => f.status === 'success' && f.id)
            .map(f => f.id!);
        onUploadComplete(successfulIds);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`relative group border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center cursor-pointer text-center
                    ${dragActive 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-[var(--border-color)] hover:border-purple-500/50 bg-[var(--bg-muted)]/10 hover:bg-[var(--bg-muted)]/20'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleChange}
                    className="hidden"
                />
                
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={20} />
                </div>
                
                <p className="text-sm font-medium text-[var(--text-main)] mb-1">
                    Drag and drop your {label} files here, or <span className="text-purple-500 hover:text-purple-400 font-semibold underline">browse</span>
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                    Supported formats: PDF, Images, Word Docs (Max {maxSizeMB}MB)
                </p>
            </div>

            {/* Uploading File Queue */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                        Files Queue ({files.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl relative overflow-hidden"
                            >
                                {/* Progress background bar */}
                                {file.status === 'uploading' && (
                                    <div 
                                        className="absolute bottom-0 left-0 h-1 bg-purple-500/20 transition-all duration-300"
                                        style={{ width: `${file.progress}%` }}
                                    />
                                )}

                                <div className="flex items-center gap-2 min-w-0 z-10">
                                    <Paperclip size={14} className="text-purple-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-main)] truncate max-w-[200px]">
                                            {file.name}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)]">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 z-10">
                                    {file.status === 'uploading' && (
                                        <span className="text-[10px] font-semibold text-purple-500">{file.progress}%</span>
                                    )}
                                    {file.status === 'success' && (
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                    )}
                                    {file.status === 'error' && (
                                        <div className="flex items-center gap-1 text-red-500" title={file.errorMsg}>
                                            <AlertCircle size={16} />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                        className="p-1 hover:bg-[var(--bg-color)] rounded-lg text-[var(--text-dim)] hover:text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvidenceUploader;
