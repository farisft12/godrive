import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Cloud, UserPlus, LayoutDashboard } from 'lucide-react';
import { plansApi, paymentsApi } from '../services/axios';
import { formatSize } from '../utils/fileIcons';
import { useAuth } from '../context/AuthContext';
import BillingToggle from '../components/BillingToggle';

export default function PricingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [yearly, setYearly] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(null);
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['public', 'plans'],
    queryFn: () => plansApi.getPlans(),
  });
  const plans = plansData?.plans ?? [];
  const savePercent = Math.max(17, ...(plans.map((p) => p.discount_percent || 0)));
  const recommendedId = plans.length >= 2 ? plans[1].id : null;

  const handleSelectPlan = async (plan) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/pricing`)}`;
      return;
    }
    setCreatingOrder(plan.id);
    try {
      const { payment } = await paymentsApi.createOrder(plan.id, yearly ? 'yearly' : 'monthly');
      queryClient.invalidateQueries({ queryKey: ['payments', 'my'] });
      window.location.href = '/checkout/' + payment.order_id;
    } catch (e) {
      setCreatingOrder(null);
      console.error(e);
      alert(e.response?.data?.error || 'Gagal membuat order.');
    }
  };

  const formatPrice = (amount, currency = 'IDR') => {
    if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
    return `${currency} ${Number(amount).toLocaleString()}`;
  };

  /** Grand total yang benar-benar dibayar (bulat): (harga * 1.11) * (1 - diskon%) */
  const getGrandTotal = (plan, useYearly) => {
    const base = useYearly ? plan.price_yearly : plan.price_amount;
    if (base == null || base === '') return 0;
    const totalAfterTax = Number(base) * 1.11;
    const discountPct = plan.discount_percent ?? 0;
    return Math.round(totalAfterTax * (1 - discountPct / 100));
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 antialiased">
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-4 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-800 font-semibold hover:opacity-90">
            <Cloud className="w-7 h-7 text-blue-600" />
            <span>GoDrive</span>
          </Link>
          <div className="flex items-center gap-6 sm:gap-8">
            <Link to="/#features" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              Features
            </Link>
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Daftar
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Pilihan Paket</h1>
          <p className="mt-3 text-gray-600 max-w-xl mx-auto">
            Pilih penyimpanan sesuai kebutuhan. Bayar bulanan atau tahunan dengan diskon.
          </p>
        </motion.div>

        <BillingToggle yearly={yearly} onChange={setYearly} savePercent={savePercent} />

        {isLoading ? (
          <div className="text-center text-gray-500 py-12">Memuat...</div>
        ) : plans.length === 0 ? (
          <div className="text-center text-gray-500 py-12">Belum ada paket. Hubungi admin.</div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          >
            {plans.map((plan, i) => {
              const hasYearly = plan.price_yearly != null && plan.price_yearly > 0;
              const isRecommended = recommendedId != null && plan.id === recommendedId;
              const displayYearly = yearly && hasYearly;
              const grandTotal = getGrandTotal(plan, displayYearly);
              const priceLabel = displayYearly ? '/ tahun' : '/ bulan';
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`bg-white rounded-xl border-2 p-6 shadow-sm hover:shadow-md transition-all flex flex-col ${
                    isRecommended
                      ? 'border-primary-500 ring-2 ring-primary-100 scale-[1.02] lg:scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isRecommended && (
                    <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-2 w-fit">
                      Direkomendasikan
                    </span>
                  )}
                  {plan.discount_percent > 0 && (
                    <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium mb-4 w-fit">
                      Hemat {plan.discount_percent}%
                    </span>
                  )}
                  <h2 className="font-semibold text-gray-900 text-lg">{plan.name}</h2>
                  <p className="text-2xl font-bold text-primary-600 mt-2">{formatSize(plan.storage_bytes)}</p>
                  <p className="text-sm text-gray-500 mt-1">penyimpanan</p>
                  <div className="mt-4">
                    {grandTotal === 0 ? (
                      <p className="text-xl font-semibold text-gray-900">Gratis</p>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-gray-900">
                          {formatPrice(grandTotal, plan.price_currency)}
                          {priceLabel}
                        </p>
                        {hasYearly && !displayYearly && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formatPrice(getGrandTotal(plan, true), plan.price_currency)}/ tahun
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={creatingOrder != null}
                    className="mt-6 inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {creatingOrder === plan.id ? 'Memproses...' : 'Pilih'}
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <p className="text-center text-sm text-gray-500 mt-12">
          Harga dapat berubah. Paket gratis tetap tersedia.
        </p>

        <section className="mt-24 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-8">Pertanyaan yang sering diajukan</h2>
          <ul className="space-y-4">
            <li className="border-b border-gray-200 pb-4">
              <p className="font-medium text-gray-900">Apakah saya bisa mengubah paket nanti?</p>
              <p className="text-sm text-gray-600 mt-1">Ya. Anda bisa upgrade atau downgrade kapan saja. Perubahan berlaku pada periode tagihan berikutnya.</p>
            </li>
            <li className="border-b border-gray-200 pb-4">
              <p className="font-medium text-gray-900">Metode pembayaran apa yang diterima?</p>
              <p className="text-sm text-gray-600 mt-1">Kami menerima transfer bank, QRIS, e-wallet (GoPay, OVO, Dana), dan kartu kredit.</p>
            </li>
            <li className="border-b border-gray-200 pb-4">
              <p className="font-medium text-gray-900">Apakah data saya aman?</p>
              <p className="text-sm text-gray-600 mt-1">Ya. Data dienkripsi dan disimpan dengan standar keamanan tinggi. Kami tidak menjual data Anda.</p>
            </li>
            <li className="pb-4">
              <p className="font-medium text-gray-900">Bagaimana cara membatalkan?</p>
              <p className="text-sm text-gray-600 mt-1">Anda bisa membatalkan langganan dari halaman Pengaturan. Penyimpanan tetap bisa dipakai sampai akhir periode yang sudah dibayar.</p>
            </li>
          </ul>
        </section>

        <footer className="mt-24 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/" className="hover:text-gray-700">Beranda</Link>
            <Link to="/pricing" className="hover:text-gray-700">Harga</Link>
            <Link to="/login" className="hover:text-gray-700">Login</Link>
            <Link to="/register" className="hover:text-gray-700">Daftar</Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} GoDrive. Semua hak dilindungi.</p>
        </footer>
      </main>
    </div>
  );
}
