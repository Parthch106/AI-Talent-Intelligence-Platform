import React from 'react';
import { AlertCircle, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

const Dashboard: React.FC = () => {
    const stats = [
        { label: 'Total Interns', value: '24', icon: <Users className="text-primary" />, trend: '+12%' },
        { label: 'Active Projects', value: '8', icon: <TrendingUp />, trend: 'Healthy' },
        { label: 'Completion Rate', value: '94%', icon: <CheckCircle2 />, trend: '+2%' },
        { label: 'Struggling Detection', value: '2', icon: <AlertCircle style={{ color: '#ef4444' }} />, trend: 'Requires Review' },
    ];

    return (
        <div>
            <div className="stats-grid">
                {stats.map((stat) => (
                    <div key={stat.label} className="card stat-card">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            {stat.icon}
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{stat.trend}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                        <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <strong>Intern: Alice Johnson</strong> submitted a milestone report for Project "AI Chatbot".
                        </div>
                        <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <strong>Mentor: Mark Smith</strong> approved the project proposal for "Graph Analytics".
                        </div>
                        <div style={{ padding: '1rem 0' }}>
                            <strong>System:</strong> Weekly performance logs generated for 24 interns.
                        </div>
                    </div>
                </div>

                <div className="card" style={{ borderColor: '#ef4444' }}>
                    <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={20} />
                        Alerts
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                        AI detected potential struggle for 2 interns based on recent sentiment analysis.
                    </p>
                    <button style={{ width: '100%', background: '#ef4444' }}>Review Flags</button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
