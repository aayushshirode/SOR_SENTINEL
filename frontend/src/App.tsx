// SOR SENTINEL — App.tsx (Root Router)
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Public Pages
import HomePage from '@/pages/public/HomePage';
import ServicesPage from '@/pages/public/ServicesPage';
import HowItWorksPage from '@/pages/public/HowItWorksPage';
import AboutPage from '@/pages/public/AboutPage';
import ContactPage from '@/pages/public/ContactPage';
import FaqPage from '@/pages/public/FaqPage';
import PrivacyPage from '@/pages/public/PrivacyPage';
import TermsPage from '@/pages/public/TermsPage';
import NotFoundPage from '@/pages/public/NotFoundPage';

// Auth Pages
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';

// Dashboard Pages
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardOverview from '@/pages/dashboard/DashboardOverview';
import TextAnalysisPage from '@/pages/dashboard/TextAnalysisPage';
import UrlAnalysisPage from '@/pages/dashboard/UrlAnalysisPage';
import AnalysisHistoryPage from '@/pages/dashboard/AnalysisHistoryPage';
import AnalysisDetailPage from '@/pages/dashboard/AnalysisDetailPage';
import DigiKeeperPage from '@/pages/dashboard/DigiKeeperPage';
import CubbisPage from '@/pages/dashboard/CubbisPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';

// Admin Pages
import AdminLayout from '@/layouts/AdminLayout';
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminAnalysesPage from '@/pages/admin/AdminAnalysesPage';
import AdminMessagesPage from '@/pages/admin/AdminMessagesPage';
import AdminAuditLogsPage from '@/pages/admin/AdminAuditLogsPage';

import { LoadingPage } from '@/components/ui/index';

// ── Route Guards ──────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingPage />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/signin" state={{ from: location }} replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingPage />;
  if (!isAuthenticated) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingPage />;
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || (user?.role === 'admin' ? '/admin' : '/dashboard');
    return <Navigate to={from} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Auth Routes (redirect if already logged in) */}
        <Route path="/signin" element={<PublicOnlyRoute><SignInPage /></PublicOnlyRoute>} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/signup" element={<PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<DashboardOverview />} />
          <Route path="analyze/text" element={<TextAnalysisPage />} />
          <Route path="analyze/url" element={<UrlAnalysisPage />} />
          <Route path="history" element={<AnalysisHistoryPage />} />
          <Route path="history/:id" element={<AnalysisDetailPage />} />
          <Route path="digikeeper" element={<DigiKeeperPage />} />
          <Route path="cubbis" element={<CubbisPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="analyses" element={<AdminAnalysesPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
