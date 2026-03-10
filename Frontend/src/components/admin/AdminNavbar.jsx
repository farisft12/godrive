import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, LogOut, Settings, Moon, Sun, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminNavbar() {
  const { user, logout } = useAuth();
  const { isDark, dark = isDark, toggleDark } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [searchQ, setSearchQ] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false);
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) setLangOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            placeholder={t('searchFiles')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder-gray-400"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleDark(); }}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Mode terang' : 'Mode gelap'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="relative" ref={langDropdownRef}>
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm"
            title="Bahasa"
          >
            <Globe className="w-5 h-5" />
            <span className="hidden sm:inline">{lang === 'id' ? 'ID' : 'EN'}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 w-40 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg z-50">
              <button
                type="button"
                onClick={() => { setLang('en'); setLangOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${lang === 'en' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => { setLang('id'); setLangOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${lang === 'id' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                Bahasa Indonesia
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block truncate max-w-[120px]">
              {user?.name}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg z-50">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setProfileOpen(false)}
              >
                <User className="w-4 h-4" /> {t('profile')}
              </Link>
              <Link
                to="/admin/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setProfileOpen(false)}
              >
                <Settings className="w-4 h-4" /> {t('settings')}
              </Link>
              <button
                type="button"
                onClick={() => { logout(); setProfileOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4" /> {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
