import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StreakDetailPage } from '@/pages/StreakDetailPage'
import { TodosPage } from '@/pages/TodosPage'
import { TimesheetPage } from '@/pages/TimesheetPage'
import { TimesheetWorkspacePage } from '@/pages/TimesheetWorkspacePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DatenschutzPage } from '@/pages/DatenschutzPage'
import { ImpressumPage } from '@/pages/ImpressumPage'

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
      <Route path="/datenschutz" element={<DatenschutzPage />} />
      <Route path="/impressum" element={<ImpressumPage />} />

      <Route path="/" element={<Navigate to="/streaks" replace />} />
      <Route
        path="/streaks"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/streaks/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <StreakDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <AppShell>
              <TodosPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute>
            <AppShell>
              <TimesheetPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timesheet/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <TimesheetWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
