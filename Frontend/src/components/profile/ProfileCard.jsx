import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { formatSize } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';

export default function ProfileCard({ user }) {
  const { t } = useLanguage();
  if (!user) return null;
  const used = user.storage_used ?? 0;
  const quota = user.storage_quota ?? 1;
  const percent = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <User className="w-12 h-12 text-primary-600" />
        </div>
        <button
          type="button"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 mb-1"
        >
          {t('changeAvatar')}
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mt-2">{user.name}</h2>
        <a href={`mailto:${user.email}`} className="text-sm text-gray-500 hover:text-primary-600 truncate w-full">
          {user.email}
        </a>
        <p className="text-xs text-gray-400 mt-2">
          {t('role')}: <span className="font-medium text-gray-600 capitalize">{user.role || 'user'}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{t('plan')}: {quota >= 2 * 1024 ** 4 ? '6TB' : quota >= 1024 ** 4 ? '2TB' : 'Free'}</p>
        <div className="w-full mt-4">
          <p className="text-xs text-gray-500 text-left mb-1">
            {formatSize(used)} / {formatSize(quota)} {t('used')}
          </p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-primary-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
