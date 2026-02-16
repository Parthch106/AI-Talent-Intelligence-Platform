import React from 'react';
import { TrendingUp, AlertTriangle, Award } from 'lucide-react';
import Card from '../common/Card';

interface PerformanceMetric {
    overall_performance_score: number;
    productivity_score: number;
    quality_score: number;
    engagement_score: number;
    growth_score: number;
    dropout_risk: string;
    dropout_risk_score: number;
    full_time_readiness_score: number;
    promotion_probability: number;
}

interface PerformanceTabProps {
    performance: PerformanceMetric | null;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ performance }) => {
    const getRiskColor = (risk: string) => {
        const colors: Record<string, string> = {
            'LOW': 'bg-emerald-500',
            'MEDIUM': 'bg-amber-500',
            'HIGH': 'bg-red-500',
        };
        return colors[risk] || 'bg-gray-500';
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
                <p className="text-slate-400 mt-1">Comprehensive performance insights</p>
            </div>

            {performance ? (
                <>
                    {/* Overall Score Circle */}
                    <Card padding="lg">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" fill="none" stroke="#334155" strokeWidth="14" />
                                    <circle
                                        cx="80" cy="80" r="70" fill="none"
                                        stroke={performance.overall_performance_score >= 80 ? '#10b981' : performance.overall_performance_score >= 60 ? '#3b82f6' : '#f59e0b'}
                                        strokeWidth="14"
                                        strokeDasharray={`${performance.overall_performance_score * 4.4} 440`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-white">{Math.round(performance.overall_performance_score)}</span>
                                    <span className="text-sm text-slate-400">out of 100</span>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                                {[
                                    { label: 'Productivity', value: performance.productivity_score, color: 'bg-blue-500' },
                                    { label: 'Quality', value: performance.quality_score, color: 'bg-emerald-500' },
                                    { label: 'Engagement', value: performance.engagement_score, color: 'bg-violet-500' },
                                    { label: 'Growth', value: performance.growth_score, color: 'bg-amber-500' },
                                ].map((metric) => (
                                    <div key={metric.label} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-300">{metric.label}</span>
                                            <span className="text-lg font-bold text-white">{Math.round(metric.value)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                                            <div className={`${metric.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${metric.value}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Risk & PPO Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card padding="lg">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-amber-500" />
                                Risk Assessment
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full ${getRiskColor(performance.dropout_risk)} flex items-center justify-center`}>
                                    <AlertTriangle size={28} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{performance.dropout_risk} Risk</p>
                                    <p className="text-sm text-slate-400">Score: {Math.round(performance.dropout_risk_score)}%</p>
                                </div>
                            </div>
                        </Card>
                        <Card padding="lg">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <Award size={18} className="text-teal-500" />
                                PPO Eligibility
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                    <Award size={28} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{Math.round(performance.promotion_probability)}%</p>
                                    <p className="text-sm text-slate-400">Full-Time Readiness</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            ) : (
                <div className="text-center py-16 text-slate-400">
                    <TrendingUp size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-white">No performance data available</p>
                    <p className="text-sm">Data will appear once metrics are computed</p>
                </div>
            )}
        </div>
    );
};

export default PerformanceTab;
