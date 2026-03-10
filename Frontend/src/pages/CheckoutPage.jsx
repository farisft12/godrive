import { useState, useRef, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pdf } from '@react-pdf/renderer';
import { Cloud, ArrowLeft, QrCode, Upload, FileImage, Building2, ChevronDown, ChevronUp, Download, Smartphone, ScanLine, CheckCircle, FileText } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, settingsApi } from '../services/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatSize } from '../utils/fileIcons';
import InvoicePDF from '../components/invoice/InvoicePDF';

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatPrice(amount, currency = 'IDR') {
  if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toLocaleString()}`;
}

const STATUS_LABELS = {
  PENDING: 'Menunggu Pembayaran',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export default function CheckoutPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planIdFromQuery = searchParams.get('plan');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success: showSuccess } = useToast();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const fileInputRef = useRef(null);

  const { data: paymentSettings } = useQuery({
    queryKey: ['settings', 'payment'],
    queryFn: () => settingsApi.getPaymentSettings(),
  });
  const paymentGateway = paymentSettings?.payment_gateway || 'qris';
  const paymentInstructions = paymentSettings?.payment_instructions || '';
  const qrisMode = paymentSettings?.qris_mode || 'static';

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['payment', orderId],
    queryFn: () => paymentsApi.getOrder(orderId),
    enabled: !!orderId,
  });

  const payment = data?.payment;
  const plan = payment?.plan;
  const expiresAt = payment?.expires_at ?? payment?.expiresAt ?? null;
  const isExpired = payment?.is_expired ?? payment?.isExpired ?? (expiresAt && new Date(expiresAt) < new Date());

  useEffect(() => {
    if (orderId || !planIdFromQuery || creatingOrder) return;
    const yearlyParam = searchParams.get('yearly');
    const interval = yearlyParam === '1' ? 'yearly' : 'monthly';
    setCreatingOrder(true);
    paymentsApi
      .createOrder(planIdFromQuery, interval)
      .then(({ payment: p }) => {
        queryClient.invalidateQueries({ queryKey: ['payments', 'my'] });
        navigate('/checkout/' + p.order_id, { replace: true });
      })
      .catch((e) => {
        setCreatingOrder(false);
        console.error(e);
      });
  }, [orderId, planIdFromQuery, creatingOrder, navigate, queryClient, searchParams]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError('');
  };

  const proofImageUrl = payment?.proof_image
    ? `${API_BASE}/api/payments/${orderId}/proof/image`
    : null;

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center text-gray-500">
          {creatingOrder ? 'Membuat order...' : 'Memuat...'}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center text-gray-500">Memuat...</div>
      </div>
    );
  }

  if (fetchError || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600">Order tidak ditemukan.</p>
          <Link to="/pricing" className="mt-4 inline-block text-primary-600 font-medium">
            Pilih paket
          </Link>
        </div>
      </div>
    );
  }

  const canUploadProof = payment.status === 'PENDING' && !isExpired;
  const isWaitingOrDone = ['WAITING_VERIFICATION', 'APPROVED', 'REJECTED'].includes(payment.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/pricing"
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Cloud className="w-6 h-6 text-blue-600" />
            <span className="font-semibold text-gray-900">GoDrive</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-500 mb-4">Order ID: <span className="font-mono font-medium text-gray-800">{payment.order_id}</span></p>
        <div className="mb-6">
          <button
            type="button"
            onClick={async () => {
              setDownloadingPdf(true);
              try {
                const blob = await pdf(
                  <InvoicePDF payment={payment} customerName={user?.name} customerEmail={user?.email} />
                ).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `godrive-invoice-${payment.order_id}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                showSuccess('Invoice PDF terunduh.');
              } catch (e) {
                console.error(e);
                showSuccess('Gagal membuat PDF.');
              } finally {
                setDownloadingPdf(false);
              }
            }}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {downloadingPdf ? 'Membuat PDF...' : 'Download Invoice (PDF)'}
          </button>
        </div>

        <div className="space-y-6">
          {/* QRIS / Metode pembayaran - layout bersih + mobile-friendly */}
          {payment.amount > 0 && payment.status !== 'APPROVED' && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6"
            >
              {paymentGateway === 'qris' ? (
                <>
                  <div className="flex justify-center mt-2 sm:mt-0">
                    <div className="bg-green-50 p-3 rounded-xl">
                      <QrCode className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div className="text-center mt-6 px-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Langkah 1: Pembayaran</h2>
                    <p className="text-sm text-gray-500 mt-1">Selesaikan pembayaran untuk mengaktifkan paket penyimpanan Anda.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-8">
                    <div className="text-center md:text-left">
                      <p className="text-sm font-medium text-gray-500 mb-1">Pindai untuk Membayar</p>
                      <p className="text-2xl md:text-3xl font-bold text-primary-600 mb-4 break-words">
                        {formatPrice(payment.amount, payment.currency)}
                      </p>
                      <div className="inline-block w-full max-w-[320px]">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                          <DynamicQrisGeneratorCard
                            orderId={orderId}
                            amount={payment.amount}
                            formatPrice={formatPrice}
                            currency={payment.currency}
                            hideAmount
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Termasuk kode unik untuk identifikasi pembayaran.</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs uppercase tracking-wide font-medium text-gray-600 mb-5">Cara Pembayaran QRIS</h3>
                      <div className="space-y-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">1. Buka Aplikasi</h4>
                            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">Gunakan aplikasi perbankan atau e-wallet yang mendukung QRIS.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                            <ScanLine className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">2. Pindai Kode QR</h4>
                            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">Arahkan kamera ke kode QR di sebelah kiri untuk memulai transaksi.</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">3. Konfirmasi & Bayar</h4>
                            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">Pastikan nominal sudah sesuai, lalu masukkan PIN Anda.</p>
                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                                payment.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                payment.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                payment.status === 'WAITING_VERIFICATION' ? 'bg-amber-100 text-amber-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {STATUS_LABELS[payment.status] || payment.status}
                              </span>
                              <p className="text-xs text-gray-600 mt-2">
                                {expiresAt
                                  ? (isExpired
                                    ? `Kadaluarsa: ${new Date(expiresAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
                                    : `Selesaikan sebelum ${new Date(expiresAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`)
                                  : 'Batas waktu sesuai pengaturan order.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 sm:mt-8 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 flex gap-3">
                    <span className="flex-shrink-0 text-amber-600" aria-hidden>⚠️</span>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {expiresAt && !isExpired ? (
                        <>Selesaikan pembayaran sebelum <b>{new Date(expiresAt).toLocaleString('id-ID')}</b>. Jika waktu habis, buat kode QR baru.</>
                      ) : (
                        <>Selesaikan pembayaran dalam batas waktu order. Jika waktu habis, cukup kembali dan buat kode QR baru.</>
                      )}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <Link
                        to="/pricing"
                        className="inline-flex items-center gap-2 text-gray-600 font-semibold text-sm hover:text-gray-900 min-h-[44px] items-center"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </Link>
                      <div className="flex flex-wrap items-center gap-3">
                        {canUploadProof && (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm min-h-[44px] transition-colors"
                            >
                              <Upload className="w-4 h-4" /> Kirim Bukti Pembayaran
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await queryClient.refetchQueries({ queryKey: ['generate-qris', orderId, payment.amount] });
                            showSuccess('QR diperbarui.');
                          }}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-sm min-h-[44px] transition-colors"
                        >
                          ↻ Buat QR Baru
                        </button>
                      </div>
                    </div>
                    {/* Inline upload: tampil setelah user pilih file */}
                    {canUploadProof && file && (
                      <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <FileImage className="w-4 h-4" /> {file.name}
                        </p>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Catatan (opsional)"
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!file) return;
                              setSubmitting(true);
                              setError('');
                              try {
                                const formData = new FormData();
                                formData.append('proof', file);
                                if (note.trim()) formData.append('payment_note', note.trim());
                                await paymentsApi.uploadProof(orderId, formData);
                                queryClient.invalidateQueries({ queryKey: ['payment', orderId] });
                                queryClient.invalidateQueries({ queryKey: ['payments', 'my'] });
                                setFile(null);
                                setNote('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                                showSuccess('Bukti pembayaran terkirim.');
                              } catch (err) {
                                setError(err.response?.data?.error || 'Gagal mengirim bukti pembayaran.');
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                          >
                            {submitting ? 'Mengirim...' : 'Kirim'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFile(null);
                              setNote('');
                              setError('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-600" /> Pembayaran
                  </h2>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {paymentInstructions || 'Instruksi pembayaran diatur di Admin → Settings → Pengaturan pembayaran.'}
                  </div>
                </>
              )}
            </motion.section>
          )}

          {payment.amount === 0 && payment.status !== 'APPROVED' && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
            >
              <p className="text-gray-700 mb-4">Paket gratis — tidak perlu pembayaran.</p>
              <Link
                to={`/payment-success?plan=${payment.plan_id}`}
                className="inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
              >
                Aktifkan paket
              </Link>
            </motion.section>
          )}

          {/* Show existing proof when waiting or rejected */}
          {isWaitingOrDone && proofImageUrl && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
            >
              <h2 className="font-semibold text-gray-900 mb-2">Bukti pembayaran yang dikirim</h2>
              <ProofImage orderId={orderId} />
              {payment.payment_note && <p className="mt-2 text-sm text-gray-600">{payment.payment_note}</p>}
              {payment.status === 'REJECTED' && (
                <p className="mt-3 text-sm text-amber-700">
                  Pembayaran ditolak. Silakan buat order baru dari halaman <Link to="/pricing" className="underline font-medium">Pilihan Paket</Link> dan unggah bukti lagi.
                </p>
              )}
            </motion.section>
          )}

          {payment.status === 'APPROVED' && (
            <p className="text-center">
              <Link to="/dashboard" className="text-primary-600 font-medium hover:underline">Kembali ke Dashboard</Link>
              {' · '}
              <Link to="/settings" className="text-primary-600 font-medium hover:underline">Pengaturan</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function ProofImage({ orderId }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('godrive_token') : '';
  const [src, setSrc] = useState(null);
  const [fail, setFail] = useState(false);

  useEffect(() => {
    if (!token || !orderId) return;
    let objectUrl;
    fetch(`${API_BASE}/api/payments/${orderId}/proof/image`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFail(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, token]);

  if (src) return <img src={src} alt="Bukti pembayaran" className="max-w-md rounded-lg border border-gray-200" />;
  if (fail) return <p className="text-sm text-gray-500">Gagal memuat gambar.</p>;
  return <p className="text-sm text-gray-500">Memuat...</p>;
}

function DynamicQrImage({ orderId, amount, isStatic }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('godrive_token') : '';
  const [src, setSrc] = useState(null);
  const [fail, setFail] = useState(false);

  useEffect(() => {
    if (!token || !orderId) return;
    if (!isStatic && amount <= 0) return;
    let objectUrl;
    fetch(`${API_BASE}/api/payments/${orderId}/qris-image`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFail(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, token, amount, isStatic]);

  if (src) return <img src={src} alt={isStatic ? 'QRIS statis - scan lalu masukkan nominal' : 'QRIS dinamis - scan untuk bayar'} className="max-w-[280px] w-full h-auto object-contain" />;
  if (fail) return <p className="text-sm text-gray-500">Gagal memuat QR. Cek NMID di Admin → Settings.</p>;
  return <p className="text-sm text-gray-500">Memuat QR...</p>;
}

/**
 * Dynamic QRIS generator: calls POST /api/payments/generate-qris, shows QR image, amount (optional), collapsible payload, download button.
 */
function DynamicQrisGeneratorCard({ orderId, amount, formatPrice, currency, hideAmount }) {
  const [payloadOpen, setPayloadOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['generate-qris', orderId, amount],
    queryFn: () => paymentsApi.generateQris(orderId, amount),
    enabled: !!orderId && !!amount && amount > 0,
  });

  const handleDownloadQr = () => {
    if (!data?.qrImage) return;
    const base64 = data.qrImage.replace(/^data:image\/png;base64,/, '');
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'godrive-payment-QR.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <p className="text-sm text-gray-500">Memuat QR dinamis...</p>;
  if (error) return <p className="text-sm text-gray-500">Gagal generate QR. Coba refresh atau gunakan metode lain.</p>;
  if (!data?.success || !data.qrImage) return <p className="text-sm text-gray-500">QR tidak tersedia.</p>;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
      {!hideAmount && (
        <p className="text-sm font-medium text-gray-900">
          Amount: <span className="text-primary-600">{formatPrice(data.amount, currency)}</span>
        </p>
      )}
      <img
        src={data.qrImage}
        alt="Dynamic QRIS - Scan to pay"
        className="max-w-[280px] w-full h-auto object-contain rounded-lg border border-gray-200"
      />
      <button
        type="button"
        onClick={handleDownloadQr}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium"
      >
        <Download className="w-4 h-4" /> Download QR
      </button>
      {data.payload && (
        <div className="w-full text-left">
          <button
            type="button"
            onClick={() => setPayloadOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {payloadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {payloadOpen ? 'Sembunyikan' : 'Tampilkan'} payload QRIS
          </button>
          {payloadOpen && (
            <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 overflow-x-auto break-all">
              {data.payload}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
