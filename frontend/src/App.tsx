import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, BarChart3, Settings, Bell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import InternList from './pages/InternList';
import ProjectList from './pages/ProjectList';

const Sidebar = () => {
  // ... (Sidebar content)
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Interns', path: '/interns', icon: <Users size={20} /> },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
  ];

  return (
    <div className="sidebar">
      <h2>AI Pipeline</h2>
      <ul className="nav-links">
        {navItems.map((item) => (
          <Link key={item.name} to={item.path} style={{ textDecoration: 'none' }}>
            <li className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.icon}
                {item.name}
              </div>
            </li>
          </Link>
        ))}
      </ul>
      <div style={{ marginTop: 'auto' }}>
        <li className="nav-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={20} />
            Settings
          </div>
        </li>
      </div>
    </div>
  );
};

const Header = () => (
  <header className="header">
    <div>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Overview</h1>
      <p style={{ color: 'var(--text-dim)', margin: 0 }}>Welcome back, Intern Manager</p>
    </div>
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <button style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem' }}>
        <Bell size={20} color="var(--text-dim)" />
      </button>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
    </div>
  </header>
);

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Header />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/interns" element={<InternList />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/reports" element={<div>Reports Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
