import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Upload,
  FolderPlus,
  Bell,
  User,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export default function Topbar({
  onMenuClick,
  searchQuery = '',
  onSearchChange,
  onUpload,
  onCreateFolder,
  placeholder = 'Search files...',
}) {
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  if (!user) return null;

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 sticky top-0 z-30 shadow-sm">
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 lg:hidden"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto">
        <div
          className={clsx(
            'w-full flex items-center gap-2 pl-3 pr-3 py-2 rounded-xl border transition-colors',
            searchFocused ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 bg-gray-50/80'
          )}
        >
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="search"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none min-w-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <motion.button
          type="button"
          onClick={onUpload}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 shadow-sm"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </motion.button>
        <motion.button
          type="button"
          onClick={onCreateFolder}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Folder</span>
        </motion.button>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <Link
          to="/settings"
          className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {user.name}
          </span>
        </Link>
      </div>
    </header>
  );
}
