import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Pages
import Dashboard from './pages/Dashboard';
import InternList from './pages/InternList';
import ProjectList from './pages/ProjectList';
import ManagerDashboard from './pages/ManagerDashboard';
import FeedbackPage from './pages/FeedbackPage';
import DocumentsPage from './pages/DocumentsPage';
import AnalysisPage from './pages/AnalysisPage';
import MonitoringDashboard from './pages/MonitoringDashboard';
import ProfilePage from './pages/ProfilePage';
import UploadWeeklyReport from './pages/UploadWeeklyReport';
import InternTasks from './pages/InternTasks';
import MyAttendance from './pages/MyAttendance';
import Login from './pages/Login';
import Register from './pages/Register';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/interns" element={<InternList />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/monitoring/*" element={<MonitoringDashboard />} />
            <Route path="/upload-report" element={<UploadWeeklyReport />} />
            <Route path="/my-tasks" element={<InternTasks />} />
            <Route path="/my-attendance" element={<MyAttendance />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/reports" element={<div className="p-6 text-slate-400">Reports Coming Soon</div>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
