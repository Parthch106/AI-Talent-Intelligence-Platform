import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringProvider } from './context/MonitoringContext';
import ToastProvider from './components/common/ToastProvider';

// Pages
import Dashboard from './pages/Dashboard';
import InternList from './pages/InternList';
import ProjectList from './pages/ProjectList';
import FeedbackPage from './pages/FeedbackPage';
import DocumentsPage from './pages/DocumentsPage';
import AnalysisPage from './pages/AnalysisPage';
import MonitoringDashboard from './pages/MonitoringDashboard';
import MonitoringOverviewPage from './pages/MonitoringOverview';
import MonitoringTasksPage from './pages/MonitoringTasks';
import MonitoringAttendancePage from './pages/MonitoringAttendance';
import MonitoringReportsPage from './pages/MonitoringReports';
import ProfilePage from './pages/ProfilePage';
import UploadWeeklyReport from './pages/UploadWeeklyReport';
import InternTasks from './pages/InternTasks';
import MyAttendance from './pages/MyAttendance';
import Login from './pages/Login';
import Register from './pages/Register';
import LearningPath from './pages/LearningPath';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import AITaskGenerator from './pages/AITaskGenerator';
import NotificationsPage from './pages/NotificationsPage';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <ThemeProvider>
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
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/interns" element={<InternList />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/analysis" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><AnalysisPage /></ProtectedRoute>} />
              <Route element={<MonitoringProvider><Outlet /></MonitoringProvider>}>
                <Route path="/monitoring" element={<MonitoringOverviewPage />} />
                <Route path="/tasks" element={<MonitoringTasksPage />} />
                <Route path="/attendance" element={<MonitoringAttendancePage />} />
                <Route path="/reports" element={<MonitoringReportsPage />} />
                <Route path="/learning-path" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><LearningPath /></ProtectedRoute>} />
                <Route path="/performance" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PerformanceAnalytics /></ProtectedRoute>} />
                <Route path="/monitoring/ai-tasks/:internId?" element={<AITaskGenerator />} />
              </Route>
              <Route path="/upload-report" element={<UploadWeeklyReport />} />
              <Route path="/my-tasks" element={<InternTasks />} />
              <Route path="/my-attendance" element={<MyAttendance />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  </ToastProvider>
  );
};

export default App;
