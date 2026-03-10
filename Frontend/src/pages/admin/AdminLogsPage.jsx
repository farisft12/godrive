import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '../../services/axios';
import { formatDate } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminLogsPage() {
  const { t } = useLanguage();
  const [action, setAction] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'logs', action],
    queryFn: () => adminApi.listLogs({ limit: 100, action: action || undefined }),
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminLogs')}</h1>
      <div className="flex gap-4">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm">
          <option value="">{t('allActions')}</option>
          <option value="login">{t('login')}</option>
          <option value="register">{t('register')}</option>
          <option value="upload">{t('upload')}</option>
          <option value="delete">{t('delete')}</option>
          <option value="rename">{t('rename')}</option>
          <option value="move">{t('move')}</option>
          <option value="trash">{t('trash')}</option>
          <option value="restore">{t('restore')}</option>
        </select>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('timestamp')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('user')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('action')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{log.user_name || log.user_email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{log.details ? JSON.stringify(log.details) : '—'}</td>
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
