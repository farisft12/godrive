import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { formatSize } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminStoragePage() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: () => adminApi.getStorageAnalytics(),
  });

  if (isLoading) return <div className="p-8 text-gray-500 dark:text-gray-400">{t('loading')}</div>;

  const disk = data?.disk || {};
  const topUsers = data?.top_users_by_storage ?? [];
  const largestFiles = data?.largest_files ?? [];
  const diskWarning = disk.warning || (disk.usage_percent >= 85);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminStorage')}</h1>

      {diskWarning && (
        <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
          <span className="text-red-600 dark:text-red-400 font-medium shrink-0">⚠ {t('storageWarningTitle')}</span>
          <p className="text-sm text-red-800 dark:text-red-200">
            {t('storageWarningMessage')} ({disk.usage_percent ?? 0}% {t('used')}). {t('storageWarningAction')}
          </p>
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('serverDisk')}</h2>
        <div className="flex gap-6 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('total')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSize(disk.total)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('used')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSize(disk.used)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('available')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSize(disk.free)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('usage')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{disk.usage_percent ?? 0}%</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${diskWarning ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(disk.usage_percent ?? 0, 100)}%` }}
          />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('topUsersByStorage')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('name')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('email')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('used')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('quota')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{u.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatSize(u.storage_used)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatSize(u.storage_quota)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('largestFiles')}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('file')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('owner')}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('size')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {largestFiles.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{f.original_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{f.owner_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatSize(f.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
