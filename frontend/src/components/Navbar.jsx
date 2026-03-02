import { useTranslation } from 'react-i18next';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GlobalControls from './GlobalControls';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
            Xode<span className="text-brand-500">Vault</span>
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <GlobalControls />

          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-1"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
