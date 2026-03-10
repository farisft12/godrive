import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Download, LogIn, User, Search } from 'lucide-react';
import clsx from 'clsx';

export default function SharedTopbar({
  onDownloadAll,
  isDownloading,
  user,
  searchQuery = '',
  onSearchChange,
  placeholder = 'Cari file...',
}) {
  const isLoggedIn = !!user;
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link
          to="/"
          className="flex items-center gap-2 min-w-0 shrink-0"
          aria-label="GoDrive home"
        >
          <Cloud className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 shrink-0" />
          <span className="font-semibold text-gray-900 hidden sm:inline truncate">
            GoDrive
          </span>
        </Link>

        <div className="flex-1 flex items-center justify-center max-w-xl mx-auto min-w-0">
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
          {onDownloadAll && (
            <button
              type="button"
              onClick={onDownloadAll}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors touch-manipulation min-h-[40px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {isDownloading ? 'Preparing...' : 'Download All'}
              </span>
            </button>
          )}
          {isLoggedIn ? (
            <Link
              to="/settings"
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user.name || 'Profil'}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors touch-manipulation min-h-[40px]"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
