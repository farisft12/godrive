import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Clock,
  Star,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import StorageWidget from './StorageWidget';
import { useLanguage } from '../context/LanguageContext';
import clsx from 'clsx';

function FolderTreeItem({ folder, currentFolderId, folders, level = 0 }) {
  const [open, setOpen] = useState(false);
  const children = folders.filter((f) => f.parent_id === folder.id);
  const isActive = currentFolderId === folder.id;
  const hasChildren = children.length > 0;

  return (
    <div className="select-none">
      <Link
        to={`/dashboard${folder.id ? `/${folder.id}` : ''}`}
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={clsx(
          'flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        )}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
          )
        ) : (
          <span className="w-4" />
        )}
        <FolderOpen className="w-5 h-5 shrink-0 text-amber-500" />
        <span className="truncate">{folder.name}</span>
      </Link>
      <AnimatePresence>
        {hasChildren && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <FolderTreeItem
                key={child.id}
                folder={child}
                currentFolderId={currentFolderId}
                folders={folders}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/dashboard', icon: FolderOpen, labelKey: 'myFiles' },
  { to: '/shared', icon: Share2, labelKey: 'sharedWithMe' },
  { to: '/dashboard', icon: Clock, labelKey: 'recent' },
  { to: '/dashboard', icon: Star, labelKey: 'starred' },
  { to: '/trash', icon: Trash2, labelKey: 'trash' },
];

export default function Sidebar({ folders = [], currentFolderId, open, onClose }) {
  const location = useLocation();
  const { t } = useLanguage();
  const rootFolders = folders.filter((f) => !f.parent_id);

  const isActive = (to, labelKey) => {
    if (to === '/trash') return location.pathname === '/trash';
    if (to === '/shared') return location.pathname === '/shared';
    if (to === '/dashboard') {
      if (labelKey === 'dashboard') return location.pathname === '/dashboard';
      return location.pathname.startsWith('/dashboard');
    }
    return location.pathname === to;
  };

  return (
    <>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={clsx(
          'w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 transition-transform duration-200 ease-out z-50',
          'fixed lg:static inset-y-0 left-0 pt-14 lg:pt-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <nav className="p-2 flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, labelKey }) => (
              <Link
                key={to + labelKey}
                to={to}
                className={clsx(
                  'flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors',
                  isActive(to, labelKey)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5 shrink-0 text-gray-500" />
                {t(labelKey)}
              </Link>
            ))}
          </div>

          {rootFolders.length > 0 && (
            <>
              <div className="my-2 border-t border-gray-100" />
              <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('folders')}
              </p>
              {rootFolders.map((f) => (
                <FolderTreeItem
                  key={f.id}
                  folder={f}
                  currentFolderId={currentFolderId}
                  folders={folders}
                />
              ))}
            </>
          )}

          <StorageWidget />
        </nav>
      </aside>
    </>
  );
}
