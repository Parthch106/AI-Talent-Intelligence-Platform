import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Upload, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { Card, Button } from '../components/common';

const allDepartments = ['AI/ML Department', 'Cloud & DevOps', 'Data Analytics', 'Development (Web/Application)', 'SOC', 'UI/UX', 'VAPT'];

const BulkUploadInternsPage: React.FC = () => {
    const navigate = useNavigate();
    const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const downloadTemplate = () => {
        const headers = 'email,full_name,department,university,phone_number,skills\n';
        const sampleRow = 'jane@example.com,Jane Doe,AI/ML Department,Stanford,Python;React\n';
        const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'interns_bulk_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkUploadSubmit = async () => {
        if (!bulkUploadFile) return;
        
        setIsUploading(true);
        setUploadProgress(0);
        
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.floor(Math.random() * 10) + 5;
            });
        }, 300);

        const formData = new FormData();
        formData.append('file', bulkUploadFile);
        
        const uploadPromise = api.post('/interns/bulk-upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.promise(uploadPromise, {
            loading: 'Uploading and processing interns...',
            success: (response) => {
                clearInterval(progressInterval);
                setUploadProgress(100);
                setTimeout(() => {
                    navigate('/directory/interns');
                }, 500);
                
                let msg = response.data.message || 'Bulk upload successful';
                if (response.data.errors && response.data.errors.length > 0) {
                    msg += ` (${response.data.errors.length} skipped)`;
                }
                return msg;
            },
            error: (err) => {
                clearInterval(progressInterval);
                setIsUploading(false);
                setUploadProgress(0);
                return err.response?.data?.error || 'Bulk upload failed';
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Directory
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <Upload className="text-blue-500" />
                    Bulk Upload <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Interns</span>
                </h1>
                <p className="text-[var(--text-dim)]">Upload a CSV file containing multiple intern profiles to register them at once.</p>
            </div>

            <Card padding="lg" className="border-blue-500/10">
                <div className="space-y-6">
                    <div className="bg-[var(--bg-muted)] rounded-xl p-6 border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-[var(--text-main)]">CSV Template Format</h4>
                            <button 
                                onClick={downloadTemplate}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors font-medium"
                            >
                                <Upload size={12} className="rotate-180" />
                                Download Sample CSV
                            </button>
                        </div>
                        <p className="text-[var(--text-dim)] text-xs mb-4">
                            The file must include headers for <strong>email</strong> and <strong>full_name</strong>. The fields <span className="font-mono bg-[var(--bg-color)] px-1 rounded">department</span>, <span className="font-mono bg-[var(--bg-color)] px-1 rounded">university</span>, <span className="font-mono bg-[var(--bg-color)] px-1 rounded">phone_number</span>, and <span className="font-mono bg-[var(--bg-color)] px-1 rounded">skills</span> (separated by semicolons) are optional.
                        </p>
                        
                        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <h5 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Valid Departments
                            </h5>
                            <div className="flex flex-wrap gap-1.5">
                                {allDepartments.map(d => (
                                    <span key={d} className="px-2 py-1 text-[10px] rounded-md bg-[var(--card-bg)] text-[var(--text-dim)] border border-[var(--border-color)]">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                                        <th className="py-2 pr-4 font-medium text-[var(--text-main)]">email <span className="text-red-400">*</span></th>
                                        <th className="py-2 pr-4 font-medium text-[var(--text-main)]">full_name <span className="text-red-400">*</span></th>
                                        <th className="py-2 pr-4 font-medium text-[var(--text-main)]">department</th>
                                        <th className="py-2 pr-4 font-medium text-[var(--text-dim)]">university</th>
                                        <th className="py-2 font-medium text-[var(--text-dim)]">skills</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[var(--text-dim)] font-mono">
                                    <tr className="border-b border-[var(--border-color)]/50">
                                        <td className="py-2 pr-4">jane@example.com</td>
                                        <td className="py-2 pr-4">Jane Doe</td>
                                        <td className="py-2 pr-4">AI/ML Department</td>
                                        <td className="py-2 pr-4">Stanford</td>
                                        <td className="py-2">Python;React</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">CSV File *</label>
                        {isUploading ? (
                            <div className="relative border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center transition-all duration-300">
                                <div className="max-w-xs mx-auto">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-[var(--text-main)]">Uploading...</span>
                                        <span className="text-sm font-bold text-blue-400">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out relative"
                                            style={{ width: `${uploadProgress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-4 animate-pulse">Processing bulk records and generating secure access tokens...</p>
                                </div>
                            </div>
                        ) : (
                            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${bulkUploadFile ? 'border-green-500 bg-green-500/5' : 'border-[var(--border-color)] hover:border-blue-500/50'}`}>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${bulkUploadFile ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <p className={`font-medium ${bulkUploadFile ? 'text-green-500' : 'text-[var(--text-main)]'}`}>
                                            {bulkUploadFile ? bulkUploadFile.name : 'Click to upload or drag and drop'}
                                        </p>
                                        <p className={`text-sm mt-1 ${bulkUploadFile ? 'text-green-500/80 font-medium' : 'text-[var(--text-muted)]'}`}>
                                            {bulkUploadFile ? 'File uploaded and ready!' : 'CSV files only'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-[var(--border-color)]">
                        <Button
                            variant="ghost"
                            onClick={() => { setBulkUploadFile(null); navigate('/directory/interns'); }}
                            disabled={isUploading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkUploadSubmit}
                            gradient="blue"
                            disabled={!bulkUploadFile || isUploading}
                            className="flex-1"
                        >
                            {isUploading ? 'Uploading...' : 'Upload File'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BulkUploadInternsPage;
