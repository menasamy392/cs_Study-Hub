import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SubjectDetailsPage from './pages/SubjectDetailsPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import SearchModal from './components/SearchModal';
import ScrollToTop from './components/ScrollToTop';
import { useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { useAnalyticsTracker } from './hooks/useAnalyticsTracker';

function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070B14]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const isAdminDashboard = location.pathname === '/admin';
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Initialize student website visitor analytics tracking
  useAnalyticsTracker();

  // Keyboard shortcut '/' to open search modal from anywhere
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is actively typing in an input or textarea
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <LanguageProvider>
      <div className="flex flex-col min-h-screen bg-[#070B14] text-[#F1F5F9] transition-colors duration-200">
        <ScrollToTop />

        {/* Global Navbar (Hidden inside Admin workspace) */}
        {!isAdminDashboard && (
          <Navbar onOpenSearch={() => setSearchModalOpen(true)} />
        )}

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/subject/:id" element={<SubjectDetailsPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Footer (Hidden inside Admin workspace) */}
        {!isAdminDashboard && <Footer />}

        {/* Global Search Modal */}
        <SearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
        />
      </div>
    </LanguageProvider>
  );
}
