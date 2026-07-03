import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { Layout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MonitoringProvider } from './context/MonitoringContext';
import ToastProvider from './components/common/ToastProvider';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ErrorBoundary } from './components/common';

const { lazy, Suspense } = React;

// Lazy Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InternList = lazy(() => import('./pages/InternList'));
const CreateInternPage = lazy(() => import('./pages/CreateInternPage'));
const BulkUploadInternsPage = lazy(() => import('./pages/BulkUploadInternsPage'));
const ProjectList = lazy(() => import('./pages/ProjectList'));
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'));
const EditProjectPage = lazy(() => import('./pages/EditProjectPage'));
const AIProjectSuggestionsPage = lazy(() => import('./pages/AIProjectSuggestionsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const InternDetailPage = lazy(() => import('./pages/InternDetailPage'));
const AssignInternPage = lazy(() => import('./pages/AssignInternPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const CreateFeedbackPage = lazy(() => import('./pages/CreateFeedbackPage'));
const FeedbackReplyPage = lazy(() => import('./pages/FeedbackReplyPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const UploadDocumentPage = lazy(() => import('./pages/UploadDocumentPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const MonitoringDashboard = lazy(() => import('./pages/MonitoringDashboard'));
const ReportDetailsPage = lazy(() => import('./pages/ReportDetailsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const CreateAdminPage = lazy(() => import('./pages/CreateAdminPage'));
const UploadWeeklyReport = lazy(() => import('./pages/UploadWeeklyReport'));
const SubmitWeeklyReportPage = lazy(() => import('./pages/SubmitWeeklyReportPage'));
const InternTasks = lazy(() => import('./pages/InternTasks'));
const MyAttendance = lazy(() => import('./pages/MyAttendance'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LearningPath = lazy(() => import('./pages/LearningPath'));
const CreateLearningPathPage = lazy(() => import('./pages/CreateLearningPathPage'));
const PerformanceAnalytics = lazy(() => import('./pages/PerformanceAnalytics'));
const AITaskGenerator = lazy(() => import('./pages/AITaskGenerator'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const CreateTaskPage = lazy(() => import('./pages/CreateTaskPage'));
const StaffPortal = lazy(() => import('./pages/StaffPortal'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// V2 Phase 4 pages
const WeeklyReportsInternPage   = lazy(() => import('./pages/WeeklyReportsInternPage'));
const WeeklyReportsManagerPage  = lazy(() => import('./pages/WeeklyReportsManagerPage'));
const WeeklyReportsAdminPage    = lazy(() => import('./pages/WeeklyReportsAdminPage'));
const PhaseTimelinePage         = lazy(() => import('./pages/PhaseTimelinePage'));
const CertificateRegistryPage   = lazy(() => import('./pages/CertificateRegistryPage'));
const StipendManagementPage     = lazy(() => import('./pages/StipendManagementPage'));
const CriteriaConfigurationPage = lazy(() => import('./pages/CriteriaConfigurationPage'));
const PhaseGateDashboard        = lazy(() => import('./pages/PhaseGateDashboard'));
const FullTimeOfferBuilderPage  = lazy(() => import('./pages/FullTimeOfferBuilderPage'));
const PublicVerifyPage         = lazy(() => import('./pages/PublicVerifyPage'));
const MyCertificatesPage        = lazy(() => import('./pages/MyCertificatesPage'));


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
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/verify-otp" element={<VerifyOTP />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/verify/:certId" element={<PublicVerifyPage />} />
                <Route path="/staff-onboarding-portal-v2" element={<StaffPortal />} />
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
                   <Route path="/directory/interns/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><CreateInternPage /></ProtectedRoute>} />
                   <Route path="/directory/interns/bulk-upload" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><BulkUploadInternsPage /></ProtectedRoute>} />
                   <Route path="/directory/interns/:internId" element={<InternDetailPage />} />
                   <Route path="/directory/projects" element={<ProjectList />} />
                   <Route path="/directory/projects/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><CreateProjectPage /></ProtectedRoute>} />
                   <Route path="/directory/projects/:projectId/edit" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><EditProjectPage /></ProtectedRoute>} />
                   <Route path="/directory/projects/ai-suggestions" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><AIProjectSuggestionsPage /></ProtectedRoute>} />
                   <Route path="/directory/projects/:projectId" element={<ProjectDetailPage />} />
                   <Route path="/directory/projects/:projectId/assign-intern" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><AssignInternPage /></ProtectedRoute>} />
                  <Route path="/directory/feedback" element={<FeedbackPage />} />
                  <Route path="/directory/feedback/create" element={<CreateFeedbackPage />} />
                  <Route path="/directory/feedback/:feedbackId/reply" element={<FeedbackReplyPage />} />
                   <Route path="/directory/documents" element={<DocumentsPage />} />
                   <Route path="/directory/documents/upload" element={<UploadDocumentPage />} />
                   <Route path="/interns/create" element={<Navigate to="/directory/interns/create" replace />} />
                   <Route path="/interns/bulk-upload" element={<Navigate to="/directory/interns/bulk-upload" replace />} />
                  <Route path="/interns" element={<Navigate to="/directory/interns" replace />} />
                   <Route path="/projects/create" element={<Navigate to="/directory/projects/create" replace />} />
                   <Route path="/projects/ai-suggestions" element={<Navigate to="/directory/projects/ai-suggestions" replace />} />
                   <Route path="/projects" element={<Navigate to="/directory/projects" replace />} />
                  <Route path="/feedback" element={<Navigate to="/directory/feedback" replace />} />
                   <Route path="/documents/upload" element={<Navigate to="/directory/documents/upload" replace />} />
                   <Route path="/documents" element={<Navigate to="/directory/documents" replace />} />

                  {/* Analytics */}
                  <Route path="/analytics/skill-intelligence" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><AnalysisPage /></ProtectedRoute>} />
                  <Route path="/analysis" element={<Navigate to="/analytics/skill-intelligence" replace />} />
                  
                <Route element={<MonitoringProvider><Outlet /></MonitoringProvider>}>
                  {/* Management */}
                  <Route path="/monitoring/:tab?" element={<MonitoringDashboard />} />
                  <Route path="/monitoring/report-details" element={<ReportDetailsPage />} />
                   <Route path="/management/tasks/create/:internId?" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><CreateTaskPage /></ProtectedRoute>} />
                   <Route path="/management/tasks/details" element={<TaskDetailPage />} />
                   <Route path="/management/tasks/:taskId" element={<TaskDetailPage />} />
                   <Route path="/management/overview" element={<Navigate to="/monitoring/overview" replace />} />
                   <Route path="/management/tasks" element={<Navigate to="/monitoring/tasks" replace />} />
                   <Route path="/tasks/create/:internId?" element={<Navigate to="/management/tasks/create/:internId?" replace />} />
                  <Route path="/management/attendance" element={<Navigate to="/monitoring/attendance" replace />} />
                  <Route path="/management/reports" element={<Navigate to="/monitoring/weekly-reports" replace />} />
                  <Route path="/management/performance" element={<Navigate to="/monitoring/performance" replace />} />
                  <Route path="/monitoring" element={<Navigate to="/monitoring/overview" replace />} />
                  <Route path="/tasks" element={<Navigate to="/monitoring/tasks" replace />} />
                  <Route path="/attendance" element={<Navigate to="/monitoring/attendance" replace />} />
                  <Route path="/reports" element={<Navigate to="/monitoring/weekly-reports" replace />} />
                  <Route path="/management/admins" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminManagement /></ProtectedRoute>} />
                  <Route path="/management/admins/create" element={<ProtectedRoute allowedRoles={['ADMIN']}><CreateAdminPage /></ProtectedRoute>} />

                  {/* Intern Workspace */}
                  <Route path="/workspace/submit-report" element={<UploadWeeklyReport />} />
                  <Route path="/workspace/submit-report/new" element={<SubmitWeeklyReportPage />} />
                  <Route path="/workspace/my-tasks" element={<InternTasks />} />
                  <Route path="/workspace/tasks/details" element={<TaskDetailPage />} />
                  <Route path="/workspace/tasks/:taskId" element={<TaskDetailPage />} />
                  <Route path="/workspace/my-attendance" element={<MyAttendance />} />
                  <Route path="/workspace/weekly-reports" element={<WeeklyReportsInternPage />} />
                  <Route path="/upload-report" element={<Navigate to="/workspace/submit-report" replace />} />
                  <Route path="/my-tasks" element={<Navigate to="/workspace/my-tasks" replace />} />
                  <Route path="/my-attendance" element={<Navigate to="/workspace/my-attendance" replace />} />
                  
                  {/* Performance & Analytics */}
                  <Route path="/analytics/learning-paths" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><LearningPath /></ProtectedRoute>} />
                  <Route path="/analytics/learning-paths/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><CreateLearningPathPage /></ProtectedRoute>} />
                  <Route path="/analytics/performance" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><PerformanceAnalytics /></ProtectedRoute>} />
                  <Route path="/learning-path/create" element={<Navigate to="/analytics/learning-paths/create" replace />} />
                  <Route path="/learning-path" element={<Navigate to="/analytics/learning-paths" replace />} />
                  <Route path="/performance" element={<Navigate to="/analytics/performance" replace />} />
                  
                  {/* AI Tools */}
                  <Route path="/tools/ai-task-generator/:internId?" element={<AITaskGenerator />} />
                  <Route path="/monitoring/ai-tasks/:internId?" element={<AITaskRedirect />} />

                  {/* V2 Career & Reports */}
                  <Route path="/career/phase-timeline/:internId?" element={<PhaseTimelinePage />} />
                  <Route path="/career/my-certificates" element={<MyCertificatesPage />} />
                  <Route path="/management/weekly-reports" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <WeeklyReportsManagerPage />
                    </ProtectedRoute>
                  } />
                   <Route path="/analytics/weekly-reports" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <WeeklyReportsAdminPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics/certificates" element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <CertificateRegistryPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics/criteria" element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <CriteriaConfigurationPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/management/stipends" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <StipendManagementPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/management/phase-gates" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <PhaseGateDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/management/offers" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <FullTimeOfferBuilderPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/certificates" element={<Navigate to="/analytics/certificates" replace />} />
                  <Route path="/stipends" element={<Navigate to="/management/stipends" replace />} />
                  <Route path="/phase-gates" element={<Navigate to="/management/phase-gates" replace />} />
                  <Route path="/offers" element={<Navigate to="/management/offers" replace />} />
                </Route>

              </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
        </AuthProvider>
    </ThemeProvider>
  </ToastProvider>
  );
};

export default App;
