import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { paymentsApi } from '../services/axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import InvoicePDF from '../components/invoice/InvoicePDF';
import { CreditCard, Download, ExternalLink, FileText } from 'lucide-react';

function formatPrice(amount, currency = 'IDR') {
  if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toLocaleString()}`;
}

const STATUS_LABELS = {
  PENDING: 'Pending Payment',
  WAITING_VERIFICATION: 'Waiting Verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

async function downloadInvoicePDF(payment, customerName, customerEmail) {
  const blob = await pdf(
    <InvoicePDF
      payment={payment}
      customerName={customerName}
      customerEmail={customerEmail}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `godrive-invoice-${payment.order_id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const statusStyles = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  WAITING_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function BillingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => paymentsApi.listMyPayments(),
  });

  const payments = data?.payments ?? [];

  return (
    <DashboardLayout
      sidebarFolders={[]}
      currentFolderId={null}
      uploadFolderId={null}
      searchQuery=""
      onSearchChange={() => {}}
      onUpload={() => {}}
      onCreateFolder={() => {}}
      searchPlaceholder={t('searchFiles')}
    >
      <div className="p-4 sm:p-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900">{t('billing')}</h1>
          <p className="text-sm text-gray-500 mt-1">Riwayat pembayaran dan invoice Anda.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 text-sm">Memuat...</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Belum ada riwayat pembayaran.</p>
              <Link
                to="/pricing"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Pilih paket <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50/80 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.plan?.name || '—'}</p>
                    <p className="text-sm text-gray-500 font-mono">{p.order_id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-gray-900">{formatPrice(p.amount, p.currency)}</p>
                    <p className="text-xs text-gray-500">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium border ${statusStyles[p.status] || statusStyles.PENDING}`}
                  >
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/checkout/${p.order_id}`}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Lihat / Bayar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => downloadInvoicePDF(p, user?.name, user?.email)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Download invoice PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
