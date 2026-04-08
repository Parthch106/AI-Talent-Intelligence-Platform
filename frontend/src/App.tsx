import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { Layout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringProvider } from './context/MonitoringContext';
import ToastProvider from './components/common/ToastProvider';
import LoadingSpinner from './components/common/LoadingSpinner';

const { lazy, Suspense } = React;

// Lazy Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InternList = lazy(() => import('./pages/InternList'));
const ProjectList = lazy(() => import('./pages/ProjectList'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const MonitoringDashboard = lazy(() => import('./pages/MonitoringDashboard'));
const MonitoringOverviewPage = lazy(() => import('./pages/MonitoringOverview'));
const MonitoringTasksPage = lazy(() => import('./pages/MonitoringTasks'));
const MonitoringAttendancePage = lazy(() => import('./pages/MonitoringAttendance'));
const MonitoringReportsPage = lazy(() => import('./pages/MonitoringReports'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UploadWeeklyReport = lazy(() => import('./pages/UploadWeeklyReport'));
const InternTasks = lazy(() => import('./pages/InternTasks'));
const MyAttendance = lazy(() => import('./pages/MyAttendance'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LearningPath = lazy(() => import('./pages/LearningPath'));
const PerformanceAnalytics = lazy(() => import('./pages/PerformanceAnalytics'));
const AITaskGenerator = lazy(() => import('./pages/AITaskGenerator'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

const AITaskRedirect: React.FC = () => {
  const { internId } = useParams();
  return <Navigate to={internId ? `/tools/ai-task-generator/${internId}` : "/tools/ai-task-generator"} replace />;
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="/register" element={<Navigate to="/auth/register" replace />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  
                  {/* Account */}
                  <Route path="/account/profile" element={<ProfilePage />} />
                  <Route path="/account/notifications" element={<NotificationsPage />} />
                  <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
                  <Route path="/notifications" element={<Navigate to="/account/notifications" replace />} />

                  {/* Directory */}
                  <Route path="/directory/interns" element={<InternList />} />
                  <Route path="/directory/projects" element={<ProjectList />} />
                  <Route path="/directory/feedback" element={<FeedbackPage />} />
                  <Route path="/directory/documents" element={<DocumentsPage />} />
                  <Route path="/interns" element={<Navigate to="/directory/interns" replace />} />
                  <Route path="/projects" element={<Navigate to="/directory/projects" replace />} />
                  <Route path="/feedback" element={<Navigate to="/directory/feedback" replace />} />
                  <Route path="/documents" element={<Navigate to="/directory/documents" replace />} />

                  {/* Analytics */}
                  <Route path="/analytics/skill-intelligence" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><AnalysisPage /></ProtectedRoute>} />
                  <Route path="/analysis" element={<Navigate to="/analytics/skill-intelligence" replace />} />
                  
                  <Route element={<MonitoringProvider><Outlet /></MonitoringProvider>}>
                    {/* Management */}
                    <Route path="/management/overview" element={<MonitoringOverviewPage />} />
                    <Route path="/management/tasks" element={<MonitoringTasksPage />} />
                    <Route path="/management/attendance" element={<MonitoringAttendancePage />} />
                    <Route path="/management/reports" element={<MonitoringReportsPage />} />
                    <Route path="/monitoring" element={<Navigate to="/management/overview" replace />} />
                    <Route path="/tasks" element={<Navigate to="/management/tasks" replace />} />
                    <Route path="/attendance" element={<Navigate to="/management/attendance" replace />} />
                    <Route path="/reports" element={<Navigate to="/management/reports" replace />} />

                    {/* Shared Analytics */}
                    <Route path="/analytics/learning-paths" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><LearningPath /></ProtectedRoute>} />
                    <Route path="/analytics/performance" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PerformanceAnalytics /></ProtectedRoute>} />
                    <Route path="/learning-path" element={<Navigate to="/analytics/learning-paths" replace />} />
                    <Route path="/performance" element={<Navigate to="/analytics/performance" replace />} />

                    <Route path="/tools/ai-task-generator/:internId?" element={<AITaskGenerator />} />
                    <Route path="/monitoring/ai-tasks/:internId?" element={<AITaskRedirect />} />
                  </Route>

                  {/* Intern Workspace */}
                  <Route path="/workspace/submit-report" element={<UploadWeeklyReport />} />
                  <Route path="/workspace/my-tasks" element={<InternTasks />} />
                  <Route path="/workspace/my-attendance" element={<MyAttendance />} />
                  <Route path="/upload-report" element={<Navigate to="/workspace/submit-report" replace />} />
                  <Route path="/my-tasks" element={<Navigate to="/workspace/my-tasks" replace />} />
                  <Route path="/my-attendance" element={<Navigate to="/workspace/my-attendance" replace />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
    </ThemeProvider>
  </ToastProvider>
  );
};

export default App;
