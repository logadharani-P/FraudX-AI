import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
import RoleSelection from './pages/RoleSelection'
import LoginCustomer from './pages/LoginCustomer'
import LoginAnalyst from './pages/LoginAnalyst'
import LoginOrganisation from './pages/LoginOrganisation'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import FraudAlerts from './pages/FraudAlerts'
import Members from './pages/Members'
import RiskAnalysis from './pages/RiskAnalysis'
import RiskTreatment from './pages/RiskTreatment'
import AIAgent from './pages/AIAgent'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import AppShell from './components/Layout/AppShell'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/select-role" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/select-role" element={<RoleSelection />} />
      <Route path="/login/customer" element={<LoginCustomer />} />
      <Route path="/login/analyst" element={<LoginAnalyst />} />
      <Route path="/login/organisation" element={<LoginOrganisation />} />

      {/* Protected routes inside AppShell layout */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/fraud-alerts" element={<FraudAlerts />} />
        <Route path="/members" element={<Members />} />
        <Route path="/risk-analysis" element={<RiskAnalysis />} />
        <Route path="/risk-treatment" element={<RiskTreatment />} />
        <Route path="/ai-agent" element={<AIAgent />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
