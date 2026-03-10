import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { formatSize, formatDate } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminFilesPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'files'],
    queryFn: () => adminApi.listFiles({ limit: 100 }),
  });

  const files = data?.files ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminFiles')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('fileExplorerDesc')}</p>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('owner')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('size')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {files.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[240px]">
                      {f.original_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{f.owner_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatSize(f.size_bytes)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(f.updated_at)}</td>
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
