import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import UnlockPage from './pages/UnlockPage';
import DashboardPage from './pages/DashboardPage';
import SharedViewPage from './pages/SharedViewPage';
import './utils/i18n';

function ProtectedRoute({ children }) {
  const { user, vaultKey } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // JWT present but vault key lost (page refresh) → ask for master password
  if (!vaultKey) return <UnlockPage />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
      <Routes>
        {/* Public share view */}
        <Route path="/share/:id" element={<SharedViewPage />} />

        {/* Landing */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />

        {/* Auth */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Protected app */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <main>
                  <DashboardPage />
                </main>
              </>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
