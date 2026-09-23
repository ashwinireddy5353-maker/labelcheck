import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// User App Pages
import { OnboardingPage } from './pages/OnboardingPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { ScanPage } from './pages/ScanPage';
import { OCRReviewPage } from './pages/OCRReviewPage';
import { SafetyReportPage } from './pages/SafetyReportPage';
import { HistoryPage } from './pages/HistoryPage';
import { SavedProductsPage } from './pages/SavedProductsPage';
import { CompareProductsPage } from './pages/CompareProductsPage';
import { NotificationsPage } from './pages/NotificationsPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminIngredientsPage } from './pages/admin/AdminIngredientsPage';
import { AdminAllergensPage } from './pages/admin/AdminAllergensPage';
import { AdminHazardsPage } from './pages/admin/AdminHazardsPage';
import { AdminAlternativesPage } from './pages/admin/AdminAlternativesPage';
import { AdminDatasetsPage } from './pages/admin/AdminDatasetsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected User Pages */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/scan/review/:scanId" element={<OCRReviewPage />} />
        <Route path="/report/:scanId" element={<SafetyReportPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/saved" element={<SavedProductsPage />} />
        <Route path="/compare" element={<CompareProductsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Protected Admin Pages */}
      <Route
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/ingredients" element={<AdminIngredientsPage />} />
        <Route path="/admin/allergens" element={<AdminAllergensPage />} />
        <Route path="/admin/hazards" element={<AdminHazardsPage />} />
        <Route path="/admin/alternatives" element={<AdminAlternativesPage />} />
        <Route path="/admin/datasets" element={<AdminDatasetsPage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
