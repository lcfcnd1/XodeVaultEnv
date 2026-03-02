import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import i18n from '../utils/i18n';

export default function GlobalControls({ className = '' }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  function toggleLang() {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('xv_lang', next);
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={toggleLang}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Toggle language"
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase font-mono text-xs">{i18n.language}</span>
      </button>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
}
