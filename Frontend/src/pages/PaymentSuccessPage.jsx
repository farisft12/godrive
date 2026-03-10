import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cloud, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { plansApi } from '../services/axios';
import { formatSize } from '../utils/fileIcons';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');

  const { data: plansData } = useQuery({
    queryKey: ['public', 'plans'],
    queryFn: () => plansApi.getPlans(),
  });
  const plans = plansData?.plans ?? [];
  const plan = planId ? plans.find((p) => String(p.id) === String(planId)) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-600" />
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-900">Pembayaran berhasil</h1>
        <p className="mt-2 text-gray-600">
          Terima kasih. Pesanan Anda telah diproses.
        </p>
        {plan && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50 text-left">
            <p className="text-sm font-medium text-gray-700">Paket diaktifkan</p>
            <p className="text-lg font-semibold text-primary-600 mt-1">{plan.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{formatSize(plan.storage_bytes)} penyimpanan</p>
          </div>
        )}
        <p className="mt-4 text-sm text-gray-500">
          Penyimpanan Anda telah diperbarui. Anda dapat mulai menggunakan kapasitas baru.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center justify-center w-full py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
