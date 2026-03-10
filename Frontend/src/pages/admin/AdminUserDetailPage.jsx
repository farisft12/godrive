import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { adminApi } from '../../services/axios';
import { formatSize, formatDate } from '../../utils/fileIcons';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminUserDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [quota, setQuota] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (user) setRole(user.role || 'user');
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (payload) => adminApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'user', id]);
      queryClient.invalidateQueries(['admin', 'users']);
      toast.success(t('userUpdated'));
      setQuota('');
      setPassword('');
    },
    onError: (err) => toast.error(err.response?.data?.error || t('updateFailed')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    if (quota) payload.storage_quota = Number(quota);
    payload.role = role;
    if (password) payload.password = password;
    if (Object.keys(payload).length === 1 && payload.role === (user?.role || 'user')) return;
    updateMutation.mutate(payload);
  };

  if (isLoading || !user) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button type="button" onClick={() => navigate('/admin/users')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        ← {t('backToUsers')}
      </button>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('userDetail')}</h1>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('information')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-gray-500 dark:text-gray-400">{t('name')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{user.name}</dd></div>
          <div><dt className="text-gray-500 dark:text-gray-400">{t('email')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{user.email}</dd></div>
          <div><dt className="text-gray-500 dark:text-gray-400">{t('storageUsed')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{formatSize(user.storage_used)}</dd></div>
          <div><dt className="text-gray-500 dark:text-gray-400">{t('quota')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{formatSize(user.storage_quota)}</dd></div>
          <div><dt className="text-gray-500 dark:text-gray-400">{t('role')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{user.role || t('user')}</dd></div>
          <div><dt className="text-gray-500 dark:text-gray-400">{t('fileCount')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{user.file_count ?? 0}</dd></div>
          <div><dt className="text-gray-500 dark:text-gray-400">{t('created')}</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{formatDate(user.created_at)}</dd></div>
        </dl>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('updateUser')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('storageQuotaOptional')}</label>
            <input
              type="number"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              placeholder="e.g. 1073741824"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('role')}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
            >
              <option value="user">{t('user')}</option>
              <option value="admin">{t('admin')}</option>
              <option value="suspended">{t('suspended')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('newPasswordOptional')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('saving') : t('saveChanges')}
          </button>
        </form>
      </section>
    </div>
  );
}
