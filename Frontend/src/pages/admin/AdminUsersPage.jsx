import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/axios';
import { formatSize } from '../../utils/fileIcons';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: () => adminApi.listUsers({ search: search || undefined, limit, offset: page * limit }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data: d }) => adminApi.updateUser(id, d),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showSuccess(data?.role === 'suspended' ? (t('userBlocked') || 'User diblokir.') : (t('userUnblocked') || 'User diaktifkan kembali.'));
    },
    onError: (err) => {
      showError(err.response?.data?.error || err.message || 'Gagal');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDeletingId(null);
      showSuccess(t('userDeleted') || 'User dihapus.');
    },
    onError: (err) => {
      showError(err.response?.data?.error || err.message || 'Gagal menghapus');
      setDeletingId(null);
    },
  });

  const handleBlock = (u) => {
    updateUserMutation.mutate({ id: u.id, data: { role: 'suspended' } });
  };

  const handleUnblock = (u) => {
    updateUserMutation.mutate({ id: u.id, data: { role: 'user' } });
  };

  const handleDelete = (u) => {
    if (!window.confirm(t('confirmDeleteUser') || `Hapus user "${u.name}" (${u.email})? Semua file dan data akan dihapus.`)) return;
    setDeletingId(u.id);
    deleteUserMutation.mutate(u.id);
  };

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminUsers')}</h1>
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder={t('searchUsers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm max-w-xs"
        />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('email')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('storageUsed')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('planRole')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatSize(u.storage_used)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{u.role || t('user')}</td>
                    <td className="px-4 py-3">
                      <span className={u.role === 'suspended' ? 'text-amber-600 text-xs font-medium' : 'text-green-600 text-xs font-medium'}>
                        {u.role === 'suspended' ? t('suspended') : t('active')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link to={`/admin/users/${u.id}`} className="text-primary-600 hover:text-primary-700 font-medium">{t('view')}</Link>
                        {u.role !== 'admin' && (
                          <>
                            {u.role === 'suspended' ? (
                              <button
                                type="button"
                                onClick={() => handleUnblock(u)}
                                disabled={updateUserMutation.isPending}
                                className="text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                              >
                                {t('unblock') || 'Aktifkan'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBlock(u)}
                                disabled={updateUserMutation.isPending}
                                className="text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                              >
                                {t('block') || 'Blokir'}
                              </button>
                            )}
                            {currentUser?.id !== u.id && (
                              <button
                                type="button"
                                onClick={() => handleDelete(u)}
                                disabled={deletingId === u.id || deleteUserMutation.isPending}
                                className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                              >
                                {deletingId === u.id ? (t('deleting') || 'Menghapus...') : (t('delete') || 'Hapus')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > limit && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('showingOf')} {page * limit + 1}–{Math.min((page + 1) * limit, total)} {t('of')} {total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 dark:text-gray-200 text-sm disabled:opacity-50">{t('previous')}</button>
              <button type="button" disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 dark:text-gray-200 text-sm disabled:opacity-50">{t('next')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
