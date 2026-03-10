import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { success: showSuccess, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [maxUploadMb, setMaxUploadMb] = useState(500);
  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [paymentGateway, setPaymentGateway] = useState('manual');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [qrisNmid, setQrisNmid] = useState('');
  const [qrisMerchantName, setQrisMerchantName] = useState('');
  const [qrisMerchantCity, setQrisMerchantCity] = useState('');
  const [qrisMode, setQrisMode] = useState('static');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
  });

  useEffect(() => {
    if (data) {
      setMaxUploadMb(data.max_upload_mb ?? 500);
      setPaymentEnabled(data.payment_enabled !== false);
      setPaymentGateway(data.payment_gateway || 'manual');
      setPaymentInstructions(data.payment_instructions || '');
      setQrisNmid(data.qris_nmid ?? '');
      setQrisMerchantName(data.qris_merchant_name ?? '');
      setQrisMerchantCity(data.qris_merchant_city ?? '');
      setQrisMode(data.qris_mode === 'static' ? 'static' : 'dynamic');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => adminApi.updateSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'settings'], updated);
      showSuccess(t('saved') || 'Pengaturan disimpan.');
    },
    onError: (err) => {
      showError(err.response?.data?.error || err.message || 'Gagal menyimpan');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      max_upload_mb: Math.min(5000, Math.max(1, parseInt(maxUploadMb, 10) || 500)),
      payment_enabled: paymentEnabled,
      payment_gateway: paymentGateway,
      payment_instructions: paymentInstructions,
      qris_nmid: qrisNmid,
      qris_merchant_name: qrisMerchantName,
      qris_merchant_city: qrisMerchantCity,
      qris_mode: qrisMode,
    });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminSettings')}</h1>
      {isLoading ? (
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('systemSettings') || 'Pengaturan sistem'}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="max_upload_mb" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('maxUploadSize') || 'Maks. ukuran upload (MB)'}
                </label>
                <input
                  id="max_upload_mb"
                  type="number"
                  min={1}
                  max={5000}
                  value={maxUploadMb}
                  onChange={(e) => setMaxUploadMb(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1 – 5000 MB per file</p>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">{t('defaultUserStorage') || 'Penyimpanan default user'}</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                  {data?.default_storage_bytes ? `${(data.default_storage_bytes / 1024 / 1024 / 1024).toFixed(1)} GB` : '1 GB'}
                </dd>
                <p className="text-xs text-gray-400 dark:text-gray-500">Ditetapkan dari paket default</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Pengaturan pembayaran</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentEnabled}
                  onChange={(e) => setPaymentEnabled(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Aktifkan pembayaran / checkout</span>
              </label>
              <div>
                <label htmlFor="payment_gateway" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Metode pembayaran (ditampilkan di checkout)
                </label>
                <select
                  id="payment_gateway"
                  value={paymentGateway}
                  onChange={(e) => setPaymentGateway(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  <option value="qris">QRIS (scan QR)</option>
                  <option value="bank_transfer">Transfer bank</option>
                  <option value="manual">Manual (instruksi custom)</option>
                  <option value="midtrans">Midtrans</option>
                  <option value="xendit">Xendit</option>
                  <option value="other">Lainnya</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">QRIS = tampil gambar QR. Transfer bank/Manual = tampil instruksi di bawah.</p>
              </div>
              <div>
                <label htmlFor="payment_instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instruksi pembayaran (ditampilkan di checkout)
                </label>
                <textarea
                  id="payment_instructions"
                  rows={4}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Contoh: Transfer ke BCA 1234567890 a.n. PT GoDrive. Gunakan kode unik pada nominal."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">QRIS (untuk metode QRIS)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Isi NMID & merchant untuk generate QR. Untuk QR <strong>dinamis</strong> yang valid saat di-scan, NMID harus terdaftar untuk <strong>dinamis</strong> di bank/penyelenggara. Jika NMID hanya terdaftar statis, gunakan mode Statis (user input nominal di e-wallet). Jika dapat error &quot;kode tidak sah&quot; atau TH91, coba mode <strong>Statis</strong>.</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="qris_mode" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mode QRIS</label>
                    <select
                      id="qris_mode"
                      value={qrisMode}
                      onChange={(e) => setQrisMode(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                    >
                      <option value="static">Statis (user masukkan nominal di aplikasi) — seperti poster QRIS</option>
                      <option value="dynamic">Dinamis (nominal di dalam QR)</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Statis cocok jika NMID hanya terdaftar untuk QR statis; menghindari error TH91.</p>
                  </div>
                  <div>
                    <label htmlFor="qris_nmid" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">NMID (National Merchant ID)</label>
                    <input
                      id="qris_nmid"
                      type="text"
                      value={qrisNmid}
                      onChange={(e) => setQrisNmid(e.target.value)}
                      placeholder="ID1025453509719"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="qris_merchant_name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nama merchant</label>
                    <input
                      id="qris_merchant_name"
                      type="text"
                      value={qrisMerchantName}
                      onChange={(e) => setQrisMerchantName(e.target.value)}
                      placeholder="GODRIVE, TRANSPORTASI"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="qris_merchant_city" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kota</label>
                    <input
                      id="qris_merchant_city"
                      type="text"
                      value={qrisMerchantCity}
                      onChange={(e) => setQrisMerchantCity(e.target.value)}
                      placeholder="JAKARTA"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? (t('saving') || 'Menyimpan...') : (t('save') || 'Simpan')}
          </button>
        </form>
      )}
    </div>
  );
}
