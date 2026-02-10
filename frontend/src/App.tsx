import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, BarChart3, Settings, Bell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import InternList from './pages/InternList';
import ProjectList from './pages/ProjectList';
import ManagerDashboard from './pages/ManagerDashboard';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const Sidebar = () => {
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

const Header = () => {
  const { user, logout } = useAuth();
  return (
    <header className="header">
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Overview</h1>
        <p style={{ color: 'var(--text-dim)', margin: 0 }}>Welcome back, {user?.email}</p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem' }}>
          <Bell size={20} color="var(--text-dim)" />
        </button>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.5rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
          Logout
        </button>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
      </div>
    </header>
  );
};

const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        <Outlet />
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/interns" element={<InternList />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/reports" element={<div>Reports Coming Soon</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
