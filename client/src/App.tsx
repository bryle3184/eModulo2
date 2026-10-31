import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './auth';
import { Spinner } from './components/ui';
import { DashboardPage } from './pages/Dashboard';
import { ModulesPage } from './pages/Modules';
import { LessonPage } from './pages/Lesson';
import { ActivitiesPage } from './pages/Activities';
import { ActivityPage } from './pages/Activity';
import { QuizzesPage } from './pages/Quizzes';
import { AssessmentPage } from './pages/Assessment';
import { DifficultiesPage } from './pages/Difficulties';
import { BadgesPage } from './pages/Badges';
import { ProgressPage } from './pages/Progress';
import { CertificatePage } from './pages/Certificate';
import { NotificationsPage } from './pages/Notifications';
import { MessagesPage } from './pages/Messages';
import { SettingsPage } from './pages/Settings';
import { ProfilePage } from './pages/Profile';
import { HelpPage } from './pages/Help';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/Auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading eMódulo…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="empty" style={{ minHeight: '60vh' }}>
      <div className="empty-icon"><span style={{ fontWeight: 800 }}>404</span></div>
      <div style={{ fontWeight: 750, fontSize: '1.1rem', color: 'var(--ink)' }}>Page not found</div>
      <p className="small">That route does not exist. Head back to your dashboard.</p>
      <a href="/" className="btn btn-primary">Back to dashboard</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/reset-password" element={<PublicOnly><ResetPasswordPage /></PublicOnly>} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="modules/:slug" element={<LessonPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="activities/:level/:concept" element={<ActivityPage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="assessment/:kind/:level" element={<AssessmentPage />} />
        <Route path="difficulties" element={<DifficultiesPage />} />
        <Route path="badges" element={<BadgesPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="certificate" element={<CertificatePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
