import React from 'react';
import { UserPlus, Search, Filter } from 'lucide-react';

const InternList: React.FC = () => {
    const interns = [
        { id: 1, name: 'Alice Johnson', university: 'Stanford University', start: '2026-01-10', status: 'Active' },
        { id: 2, name: 'Bob Wilson', university: 'MIT', start: '2026-01-15', status: 'Struggling' },
        { id: 3, name: 'Charlie Davis', university: 'UC Berkeley', start: '2026-01-20', status: 'Active' },
        { id: 4, name: 'Diana Prince', university: 'Harvard', start: '2026-02-01', status: 'Active' },
    ];

    return (
        <div>
            <div className="header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <Search size={18} color="var(--text-dim)" />
                        <input
                            type="text"
                            placeholder="Search interns by name, university..."
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                        />
                    </div>
                    <button style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={18} /> Filter
                    </button>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '1rem' }}>
                    <UserPlus size={18} /> Add Intern
                </button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-dim)', fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '1rem' }}>Name</th>
                            <th style={{ padding: '1rem' }}>University</th>
                            <th style={{ padding: '1rem' }}>Start Date</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interns.map((intern) => (
                            <tr key={intern.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '1rem' }}>{intern.name}</td>
                                <td style={{ padding: '1rem' }}>{intern.university}</td>
                                <td style={{ padding: '1rem' }}>{intern.start}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.25rem',
                                        background: intern.status === 'Struggling' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: intern.status === 'Struggling' ? '#ef4444' : '#10b981',
                                        fontSize: '0.75rem'
                                    }}>
                                        {intern.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button style={{ background: 'transparent', color: 'var(--primary-color)', padding: 0 }}>View Profile</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InternList;
