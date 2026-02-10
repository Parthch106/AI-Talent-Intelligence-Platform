import React from 'react';
import { Plus, LayoutGrid, List as ListIcon } from 'lucide-react';

const ProjectList: React.FC = () => {
    const projects = [
        { id: 1, title: 'AI Chatbot Integration', mentor: 'Mark Smith', interns: 3, status: 'In Progress' },
        { id: 2, title: 'Graph Data Visualization', mentor: 'Sarah Connor', interns: 2, status: 'Proposed' },
        { id: 3, title: 'NLP Sentiment Engine', mentor: 'James Bond', interns: 1, status: 'Completed' },
        { id: 4, title: 'Blockchain for Intern Logs', mentor: 'Vitalik Buterin', interns: 4, status: 'In Progress' },
    ];

    return (
        <div>
            <div className="header">
                <h2 style={{ margin: 0 }}>Projects</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{ background: 'var(--card-bg)', padding: '0.5rem' }}><LayoutGrid size={18} /></button>
                    <button style={{ background: 'var(--card-bg)', padding: '0.5rem' }}><ListIcon size={18} /></button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> New Project
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {projects.map((project) => (
                    <div key={project.id} className="card">
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{project.title}</h4>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                            Mentor: {project.mentor}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.75rem' }}>
                                <Users size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                {project.interns} Interns
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '1rem',
                                background: project.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                color: project.status === 'Completed' ? '#10b981' : '#6366f1'
                            }}>
                                {project.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Re-using Users icon from lucide
import { Users } from 'lucide-react';

export default ProjectList;
