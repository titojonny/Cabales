import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardPage } from './pages/DashboardPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { SettlementPage } from './pages/SettlementPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/events" element={<DashboardPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/events/:id/settlement" element={<SettlementPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
