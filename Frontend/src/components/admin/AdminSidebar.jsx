import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  HardDrive,
  FolderOpen,
  Link2,
  FileText,
  Server,
  CreditCard,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useLanguage } from '../../context/LanguageContext';

const items = [
  { to: '/admin', icon: LayoutDashboard, labelKey: 'adminDashboard' },
  { to: '/admin/users', icon: Users, labelKey: 'adminUsers' },
  { to: '/admin/storage', icon: HardDrive, labelKey: 'adminStorage' },
  { to: '/admin/files', icon: FolderOpen, labelKey: 'adminFiles' },
  { to: '/admin/shares', icon: Link2, labelKey: 'adminShares' },
  { to: '/admin/logs', icon: FileText, labelKey: 'adminLogs' },
  { to: '/admin/server', icon: Server, labelKey: 'adminServer' },
  { to: '/admin/plans', icon: CreditCard, labelKey: 'adminPlans' },
  { to: '/admin/payments', icon: Wallet, labelKey: 'adminPayments' },
  { to: '/admin/settings', icon: Settings, labelKey: 'adminSettings' },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const { t } = useLanguage();
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 h-full overflow-hidden"
    >
      <div className="p-3 flex items-center justify-between min-h-[56px] border-b border-gray-100 dark:border-gray-700">
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-gray-800 dark:text-gray-200 truncate">
            {t('adminGoDriveTitle')}
          </motion.span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {items.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{t(labelKey)}</span>}
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
}
