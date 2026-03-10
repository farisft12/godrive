import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { formatSize } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminServerPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'server'],
    queryFn: () => adminApi.getServerHealth(),
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="p-8 text-gray-500 dark:text-gray-400">{t('loading')}</div>;

  const mem = data?.memory || {};
  const disk = data?.disk || {};
  const cpu = data?.cpu || {};

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminServer')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('cpu')}</h2>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{cpu.count ?? 0} {t('cores')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('load')}: {(cpu.load_avg && cpu.load_avg[0]) ?? '—'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('memory')}</h2>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{mem.usage_percent ?? 0}% {t('used')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatSize(mem.used)} / {formatSize(mem.total)}
          </p>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${Math.min(mem.usage_percent ?? 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t('serverDisk')}</h2>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{disk.usage_percent ?? 0}% {t('used')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatSize(disk.used)} / {formatSize(disk.total)}
          </p>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${Math.min(disk.usage_percent ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
