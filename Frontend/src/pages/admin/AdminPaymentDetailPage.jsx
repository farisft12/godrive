import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronLeft, Check, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatPrice(amount, currency = 'IDR') {
  if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toLocaleString()}`;
}

export default function AdminPaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [proofSrc, setProofSrc] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payment', id],
    queryFn: () => adminApi.getPayment(id),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approvePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'stats'] });
      toast.success('Pembayaran disetujui. Kuota pengguna telah ditingkatkan.');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Gagal menyetujui'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.rejectPayment(id, { admin_note: adminNote.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'stats'] });
      toast.success('Pembayaran ditolak.');
      setAdminNote('');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Gagal menolak'),
  });

  const payment = data?.payment;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('godrive_token') : '';

  useEffect(() => {
    if (!payment?.proof_image || !id || !token) return;
    let objectUrl;
    fetch(`${API_BASE}/api/admin/payments/${id}/proof/image`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setProofSrc(objectUrl);
      })
      .catch(() => setProofSrc(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, payment?.proof_image, token]);

  if (isLoading || !id) {
    return <div className="p-6 text-gray-500">Memuat...</div>;
  }
  if (!payment) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Pembayaran tidak ditemukan.</p>
        <button type="button" onClick={() => navigate('/admin/payments')} className="mt-2 text-primary-600 hover:underline">
          Kembali ke daftar
        </button>
      </div>
    );
  }

  const canVerify = payment.status === 'WAITING_VERIFICATION';
  const isExpired = payment.expires_at && new Date(payment.expires_at) < new Date();
  const canApprove = canVerify && !isExpired;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/payments')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Detail Pembayaran</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{payment.order_id}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Info Order</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500 dark:text-gray-400">User</dt><dd className="text-gray-900 dark:text-gray-100">{payment.user_name} ({payment.user_email})</dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Plan</dt><dd className="text-gray-900 dark:text-gray-100">{payment.plan?.name || '-'}</dd></div>
            {payment.base_price != null && <div><dt className="text-gray-500 dark:text-gray-400">Base price</dt><dd className="text-gray-900 dark:text-gray-100">{formatPrice(payment.base_price, payment.currency)}</dd></div>}
            {payment.unique_code != null && <div><dt className="text-gray-500 dark:text-gray-400">Unique code</dt><dd className="text-gray-900 dark:text-gray-100">{payment.unique_code}</dd></div>}
            <div><dt className="text-gray-500 dark:text-gray-400">Final amount</dt><dd className="text-gray-900 dark:text-gray-100 font-medium">{formatPrice(payment.amount, payment.currency)}</dd></div>
            {payment.expires_at && <div><dt className="text-gray-500 dark:text-gray-400">Expires</dt><dd className="text-gray-900 dark:text-gray-100">{new Date(payment.expires_at).toLocaleString('id-ID')}{isExpired ? ' (expired)' : ''}</dd></div>}
            <div><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              payment.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
              payment.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
              payment.status === 'WAITING_VERIFICATION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>{payment.status}</span></dd></div>
            <div><dt className="text-gray-500 dark:text-gray-400">Date</dt><dd className="text-gray-900 dark:text-gray-100">{payment.created_at ? new Date(payment.created_at).toLocaleString('id-ID') : '-'}</dd></div>
            {payment.payment_note && <div><dt className="text-gray-500 dark:text-gray-400">Catatan user</dt><dd className="text-gray-900 dark:text-gray-100">{payment.payment_note}</dd></div>}
            {payment.admin_note && <div><dt className="text-gray-500 dark:text-gray-400">Admin note (reject)</dt><dd className="text-gray-900 dark:text-gray-100">{payment.admin_note}</dd></div>}
          </dl>
          {canVerify && (
            <div className="mt-6">
              {isExpired && <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">Order ini sudah kedaluwarsa. Tidak dapat disetujui.</p>}
              {!isExpired && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Konfirmasi sudah dibayar dengan Approve; jika belum sesuai, Reject dan isi catatan (opsional).</p>}
              <div className="flex flex-col gap-3">
                {canVerify && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Catatan admin (saat Reject)</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Alasan penolakan (opsional)"
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                )}
              <div className="flex gap-3">
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || !canApprove}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
            </div>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Bukti Pembayaran</h2>
          {proofSrc ? (
            <img src={proofSrc} alt="Bukti pembayaran" className="max-w-full rounded-lg border border-gray-200 dark:border-gray-600" />
          ) : payment.proof_image ? (
            <p className="text-sm text-gray-500">Gagal memuat gambar.</p>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada bukti diunggah.</p>
          )}
        </div>
      </div>
    </div>
  );
}
