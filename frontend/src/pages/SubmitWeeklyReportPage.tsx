import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { ArrowLeft, FileUp, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { toast } from 'react-hot-toast';

const SubmitWeeklyReportPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setError('Please select a PDF file only');
                setPdfFile(null);
                return;
            }
            setPdfFile(file);
            setError('');
        }
    };

    const handleSubmitReport = async (e: React.FormEvent, isDraft: boolean = false) => {
        e.preventDefault();

        if (!pdfFile) {
            toast.error('Strategic documentation required: Please select a PDF file');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('pdf_report', pdfFile);
        formData.append('is_draft', String(isDraft));

        toast.promise(
            axios.post('/analytics/weekly-reports/submit/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }),
            {
                loading: isDraft ? 'Saving draft...' : 'Injecting performance metrics into the analytical engine...',
                success: () => {
                    setPdfFile(null);
                    navigate(-1);
                    return isDraft 
                        ? 'Draft saved successfully' 
                        : 'Weekly report successfully synchronized and archived';
                },
                error: (err) => {
                    setLoading(false);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return (err as any).response?.data?.error || 'Failed to synchronize performance report';
                }
            }
        ).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Reports
            </button>

            {/* Title Section */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <FileUp className="text-purple-500" />
                    Submit New <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Weekly Report</span>
                </h1>
                <p className="text-[var(--text-dim)]">
                    Upload your weekly report as a PDF document. The system will automatically parse and extract the relevant information from your report.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Upload Card */}
            <Card padding="lg" className="border-purple-500/10">
                <form className="space-y-6">
                    <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-5">
                        <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                            💡 **Tip:** Ensure your PDF report includes clearly formatted sections for **Tasks Completed**, **Challenges**, and **Learnings** so the AI engine can synchronize your metrics perfectly.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-[var(--text-dim)]">
                            Upload PDF Report (Required)
                        </label>
                        
                        <div className="relative border-2 border-dashed border-[var(--border-color)] hover:border-purple-500/50 rounded-2xl p-8 transition-colors text-center group cursor-pointer">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="p-4 bg-purple-500/10 rounded-full text-purple-400 group-hover:scale-110 transition-transform">
                                    <FileUp size={32} />
                                </div>
                                <div>
                                    <span className="text-purple-400 font-bold hover:text-purple-300">Choose a file</span>
                                    <span className="text-[var(--text-dim)]"> or drag & drop it here</span>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">PDF documents only (max 10MB)</span>
                            </div>
                        </div>

                        {pdfFile && (
                            <div className="mt-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 animate-slide-up">
                                <CheckCircle size={20} className="shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{pdfFile.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                                        {(pdfFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[var(--border-color)]">
                        <Button
                            type="button"
                            onClick={() => navigate(-1)}
                            variant="outline"
                            className="order-3 sm:order-1 sm:flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 order-2 sm:flex-1"
                            disabled={loading || !pdfFile}
                            onClick={(e) => handleSubmitReport(e, true)}
                        >
                            {loading ? 'Saving...' : 'Save as Draft'}
                        </Button>
                        <Button
                            type="button"
                            gradient="purple"
                            className="order-1 sm:order-3 sm:flex-1"
                            disabled={loading || !pdfFile}
                            onClick={(e) => handleSubmitReport(e, false)}
                        >
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default SubmitWeeklyReportPage;
