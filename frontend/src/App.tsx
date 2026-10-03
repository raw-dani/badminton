import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { useAuth } from './context/AuthContext'

// Pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { BattleLeaderboardPage } from './pages/BattleLeaderboardPage'
import { RankLeaderboardPage } from './pages/RankLeaderboardPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { CreateMatchPage } from './pages/CreateMatchPage'
import { MatchListPage } from './pages/MatchListPage'
import { MatchDetailsPage } from './pages/MatchDetailsPage'
import { PointLedgerPage } from './pages/PointLedgerPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ProfileSettingsPage } from './pages/ProfileSettingsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminDisputesPage } from './pages/AdminDisputesPage'
import { AdminPointsPage } from './pages/AdminPointsPage'
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage'

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Admin Route Wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }
  return isAuthenticated && isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1d] text-slate-100 selection:bg-brand-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/leaderboards/battle" element={<BattleLeaderboardPage />} />
          <Route path="/leaderboards/rank" element={<RankLeaderboardPage />} />
          <Route path="/players/:username" element={<PublicProfilePage />} />
          <Route path="/matches" element={<MatchListPage />} />
          <Route path="/matches/:id" element={<MatchDetailsPage />} />

          {/* Authenticated Player Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/create"
            element={
              <ProtectedRoute>
                <CreateMatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/points/ledger"
            element={
              <ProtectedRoute>
                <PointLedgerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Administrator Suite Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/matches"
            element={
              <AdminRoute>
                <MatchListPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/disputes"
            element={
              <AdminRoute>
                <AdminDisputesPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/points"
            element={
              <AdminRoute>
                <AdminPointsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <AdminRoute>
                <AdminAuditLogsPage />
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export default App
