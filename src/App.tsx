import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from './components/Layout';
import { PageLoading } from './components/ui';
import { useAuth } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { InvitePage } from './pages/InvitePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectPage } from './pages/ProjectPage';
import { RunDashboard } from './pages/RunDashboard';
import { FocusView } from './pages/FocusView';
import { DefectsBoard } from './pages/DefectsBoard';
import { SignOffPage } from './pages/SignOffPage';
import { ReportPage, PublicReportPage } from './pages/ReportPage';
import { UsersPage } from './pages/UsersPage';
import { CaseHistoryPage } from './pages/CaseHistoryPage';

function Private({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/audit/:token" element={<PublicReportPage />} />
      <Route
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/runs/:id" element={<RunDashboard />} />
        <Route path="/runs/:id/defects" element={<DefectsBoard />} />
        <Route path="/runs/:id/signoff" element={<SignOffPage />} />
        <Route path="/runs/:id/cases/:caseId/history" element={<CaseHistoryPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route
        path="/runs/:id/test"
        element={
          <Private>
            <FocusView />
          </Private>
        }
      />
      <Route
        path="/runs/:id/report"
        element={
          <Private>
            <ReportPage />
          </Private>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
