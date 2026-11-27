import { Navigate, Route, Routes } from 'react-router'
import GuestOnly from './components/GuestOnly.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import RequireSession from './components/RequireSession.jsx'
import Shell from './components/Shell.jsx'
import { signInWithGoogle } from './lib/auth.js'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx'
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx'
import SignUpPage from './pages/auth/SignUpPage.jsx'
import CyclePage from './pages/CyclePage.jsx'
import AgentsPage from './pages/AgentsPage.jsx'
import InboxPage from './pages/InboxPage.jsx'
import IssuePage from './pages/IssuePage.jsx'
import MyIssuesPage from './pages/MyIssuesPage.jsx'
import OverviewPage from './pages/OverviewPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProjectPage from './pages/ProjectPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import TeamCyclesPage from './pages/TeamCyclesPage.jsx'
import TeamIssuesPage from './pages/TeamIssuesPage.jsx'
import ViewPage from './pages/ViewPage.jsx'
import ViewsPage from './pages/ViewsPage.jsx'
import LabelsSettingsPage from './pages/settings/LabelsSettingsPage.jsx'
import PersonalSettingsPage from './pages/settings/PersonalSettingsPage.jsx'
import SettingsLayout from './pages/settings/SettingsLayout.jsx'
import TeamsSettingsPage from './pages/settings/TeamsSettingsPage.jsx'
import UsersSettingsPage from './pages/settings/UsersSettingsPage.jsx'
import WorkspaceSettingsPage from './pages/settings/WorkspaceSettingsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="login" element={<LoginPage onGoogle={signInWithGoogle} />} />
        <Route path="signup" element={<SignUpPage onGoogle={signInWithGoogle} />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="verify-email" element={<VerifyEmailPage />} />
      <Route element={<RequireSession />}>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="my-issues" element={<MyIssuesPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="team/:teamKey" element={<TeamIssuesPage />} />
          <Route path="team/:teamKey/cycles" element={<TeamCyclesPage />} />
          <Route path="team/:teamKey/cycles/:cycleNumber" element={<CyclePage />} />
          <Route path="views" element={<ViewsPage />} />
          <Route path="views/:viewId" element={<ViewPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectPage />} />
          <Route path="issue/:identifier" element={<IssuePage />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="personal" replace />} />
            <Route path="personal" element={<PersonalSettingsPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="workspace" element={<WorkspaceSettingsPage />} />
              <Route path="users" element={<UsersSettingsPage />} />
              <Route path="teams" element={<TeamsSettingsPage />} />
              <Route path="labels" element={<LabelsSettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
