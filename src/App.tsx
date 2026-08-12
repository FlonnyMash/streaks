import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { CompleteProfileRoute } from '@/components/auth/CompleteProfileRoute'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { CompleteProfilePage } from '@/pages/CompleteProfilePage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StreakDetailPage } from '@/pages/StreakDetailPage'
import { TodosPage } from '@/pages/TodosPage'
import { TimesheetPage } from '@/pages/TimesheetPage'
import { TimesheetWorkspacePage } from '@/pages/TimesheetWorkspacePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage'
import { LegalPage } from '@/pages/LegalPage'

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/complete-profile"
        element={
          <CompleteProfileRoute>
            <CompleteProfilePage />
          </CompleteProfileRoute>
        }
      />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/imprint" element={<LegalPage />} />
      <Route path="/legal" element={<Navigate to="/imprint" replace />} />
      <Route path="/datenschutz" element={<Navigate to="/privacy" replace />} />
      <Route path="/impressum" element={<Navigate to="/imprint" replace />} />

      <Route path="/" element={<Navigate to="/streaks" replace />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/streaks" element={<DashboardPage />} />
        <Route path="/streaks/:id" element={<StreakDetailPage />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="/timesheet" element={<TimesheetPage />} />
        <Route path="/timesheet/:id" element={<TimesheetWorkspacePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
