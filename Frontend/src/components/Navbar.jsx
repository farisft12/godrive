import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Upload,
  FolderPlus,
  Bell,
  User,
  Menu,
  Cloud,
  Settings,
  LogOut,
  Shield,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import clsx from 'clsx';

export default function Navbar({
  onMenuClick,
  searchQuery = '',
  onSearchChange,
  onUpload,
  onCreateFolder,
  placeholder,
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const searchPlaceholder = placeholder ?? t('searchFiles');
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setAvatarOpen(false);
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 sticky top-0 z-30 shadow-sm">
      {/* Left: menu (mobile) + logo */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden shrink-0"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <Cloud className="w-7 h-7 text-primary-600" />
          <span className="font-semibold text-gray-900 hidden sm:inline">GoDrive</span>
        </Link>
      </div>

      {/* Center: search */}
      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto min-w-0">
        <div
          className={clsx(
            'w-full flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg border transition-colors',
            searchFocused ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 bg-gray-50/80'
          )}
        >
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none min-w-0"
          />
        </div>
      </div>

      {/* Right: actions + avatar */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <motion.button
          type="button"
          onClick={onUpload}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">{t('upload')}</span>
        </motion.button>
        <motion.button
          type="button"
          onClick={onCreateFolder}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('newFolder')}</span>
        </motion.button>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((o) => !o)}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
              {user.name}
            </span>
          </button>
          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 py-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  {t('profile')}
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  {t('settings')}
                </Link>
                <Link
                  to="/billing"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  {t('billing')}
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Shield className="w-4 h-4 text-gray-500" />
                    {t('admin')}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  {t('logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
