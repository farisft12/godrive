import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/axios';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

function formatPrice(amount, currency = 'IDR') {
  if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toLocaleString()}`;
}

const STATUS_LABELS = {
  PENDING: 'Pending',
  WAITING_VERIFICATION: 'Waiting Verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export default function AdminPaymentsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments', statusFilter],
    queryFn: () => adminApi.listPayments({ status: statusFilter || undefined }),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => adminApi.approvePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'stats'] });
      showSuccess('Pembayaran diterima. Storage user telah dinaikkan.');
    },
    onError: (err) => {
      showError(err.response?.data?.error || 'Gagal menerima pembayaran.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, admin_note }) => adminApi.rejectPayment(id, { admin_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'stats'] });
      showSuccess('Pembayaran ditolak.');
    },
    onError: (err) => {
      showError(err.response?.data?.error || 'Gagal menolak pembayaran.');
    },
  });

  const payments = data?.payments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminPayments')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Admin menerima status pembayaran dan mengonfirmasi sudah/belum dibayar. Verifikasi bukti transfer lalu Approve atau Reject.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        >
          <option value="">Semua status</option>
          <option value="PENDING">Pending</option>
          <option value="WAITING_VERIFICATION">Waiting Verification</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Memuat...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Tidak ada data pembayaran.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Proof</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">{p.order_id}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-gray-100">{p.user_name}</span>
                      <br />
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{p.user_email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.plan?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{formatPrice(p.amount, p.currency)}</td>
                    <td className="px-4 py-3">
                      {p.proof_image ? (
                        <Link to={`/admin/payments/${p.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">View</Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                          p.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          p.status === 'WAITING_VERIFICATION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/admin/payments/${p.id}`} className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline text-sm">
                          <Eye className="w-4 h-4" /> Detail
                        </Link>
                        {p.status === 'WAITING_VERIFICATION' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Terima pembayaran ${p.order_id}? Storage user akan dinaikkan.`)) {
                                  approveMutation.mutate(p.id);
                                }
                              }}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const note = window.prompt('Alasan penolakan (opsional):');
                                if (note !== null) {
                                  rejectMutation.mutate({ id: p.id, admin_note: note });
                                }
                              }}
                              disabled={rejectMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
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
      </div>
    </div>
  );
}
