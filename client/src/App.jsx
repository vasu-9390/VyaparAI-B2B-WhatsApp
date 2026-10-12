import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';

// Pages
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx';
import { QuotationListPage } from './pages/quotations/QuotationListPage.jsx';
import { OrderListPage } from './pages/orders/OrderListPage.jsx';
import { LeadListPage } from './pages/leads/LeadListPage.jsx';
import { ProductListPage } from './pages/products/ProductListPage.jsx';
import { CustomerListPage } from './pages/customers/CustomerListPage.jsx';
import { WhatsAppInboxPage } from './pages/inbox/WhatsAppInboxPage.jsx';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage.jsx';
import { SettingsPage } from './pages/settings/SettingsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected SaaS Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inbox" element={<WhatsAppInboxPage />} />
              <Route path="/quotations" element={<QuotationListPage />} />
              <Route path="/orders" element={<OrderListPage />} />
              <Route path="/leads" element={<LeadListPage />} />
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/customers" element={<CustomerListPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
