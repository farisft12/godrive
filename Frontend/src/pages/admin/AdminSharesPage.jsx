import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { formatDate } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminSharesPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'shares'],
    queryFn: () => adminApi.listShares({ limit: 50 }),
  });

  const shares = data?.shares ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminShares')}</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('fileType')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('owner')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('created')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('expires')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {shares.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{s.file_name || (s.folder_id ? t('folder') : '—')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{s.owner_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{s.expires_at ? formatDate(s.expires_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
