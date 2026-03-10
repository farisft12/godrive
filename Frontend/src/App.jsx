import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { UploadProvider } from './context/UploadContext';
import { LanguageProvider } from './context/LanguageContext';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyPage from './pages/VerifyPage';
import PricingPage from './pages/PricingPage';
import Dashboard from './pages/Dashboard';
import Trash from './pages/Trash';
import Shared from './pages/Shared';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import SharePage from './pages/SharePage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import BillingPage from './pages/BillingPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminStoragePage from './pages/admin/AdminStoragePage';
import AdminFilesPage from './pages/admin/AdminFilesPage';
import AdminSharesPage from './pages/admin/AdminSharesPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminServerPage from './pages/admin/AdminServerPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminPaymentDetailPage from './pages/admin/AdminPaymentDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
});

import { useLanguage } from './context/LanguageContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/share/:token" element={<SharePage />} />
      <Route
        path="/checkout"
        element={
          <PrivateRoute>
            <CheckoutPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/checkout/:orderId"
        element={
          <PrivateRoute>
            <CheckoutPage />
          </PrivateRoute>
        }
      />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route
        path="/billing"
        element={
          <PrivateRoute>
            <BillingPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/:folderId"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/trash"
        element={
          <PrivateRoute>
            <Trash />
          </PrivateRoute>
        }
      />
      <Route
        path="/shared"
        element={
          <PrivateRoute>
            <Shared />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="storage" element={<AdminStoragePage />} />
        <Route path="files" element={<AdminFilesPage />} />
        <Route path="shares" element={<AdminSharesPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
        <Route path="server" element={<AdminServerPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="payments/:id" element={<AdminPaymentDetailPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <UploadProvider>
              <ToastProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppRoutes />
                </BrowserRouter>
              </ToastProvider>
            </UploadProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
