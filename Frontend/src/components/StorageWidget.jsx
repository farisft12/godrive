import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HardDrive, ArrowUpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatSize } from '../utils/fileIcons';

export default function StorageWidget() {
  const { user } = useAuth();
  if (!user) return null;

  const used = Number(user.storage_used ?? 0);
  const quota = Number(user.storage_quota ?? 1);
  const percent = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;

  return (
    <div className="p-3 mt-auto border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-xs font-medium text-gray-700">Storage</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-primary-500'}
          style={{ height: '100%' }}
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        {formatSize(used)} of {formatSize(quota)} used
      </p>
      <Link
        to="/pricing"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        <ArrowUpCircle className="w-3.5 h-3.5" />
        Upgrade
      </Link>
    </div>
  );
}
