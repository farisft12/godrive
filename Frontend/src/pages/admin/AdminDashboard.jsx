import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, FileText, HardDrive, Link2, Wallet, Clock, CheckCircle, XCircle } from 'lucide-react';
import { adminApi } from '../../services/axios';
import { formatSize } from '../../utils/fileIcons';
import StatCard from '../../components/admin/StatCard';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });
  const { data: storage } = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: () => adminApi.getStorageAnalytics(),
  });
  const { data: paymentStats } = useQuery({
    queryKey: ['admin', 'payments', 'stats'],
    queryFn: () => adminApi.getPaymentStats(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  const disk = storage?.disk || {};
  const usedPct = disk.usage_percent ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminDashboard')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('totalUsers')} value={stats?.total_users ?? 0} />
        <StatCard icon={FileText} label={t('totalFiles')} value={(stats?.total_files ?? 0).toLocaleString()} />
        <StatCard
          icon={HardDrive}
          label={t('storageUsed')}
          value={formatSize(stats?.total_storage_used ?? 0)}
          sub={t('acrossAllUsers')}
        />
        <StatCard icon={Link2} label={t('activeSharedLinks')} value={stats?.active_shared_links ?? 0} />
      </div>

      {paymentStats && (
        <>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Payment stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={Wallet}
              label="Total revenue"
              value={`Rp ${(paymentStats.total_revenue ?? 0).toLocaleString('id-ID')}`}
            />
            <StatCard icon={Clock} label="Pending" value={paymentStats.pending_count ?? 0} />
            <StatCard icon={CheckCircle} label="Approved" value={paymentStats.approved_count ?? 0} />
            <StatCard icon={XCircle} label="Rejected" value={paymentStats.rejected_count ?? 0} />
            <StatCard
              icon={Wallet}
              label="Monthly income"
              value={`Rp ${(paymentStats.monthly_income ?? 0).toLocaleString('id-ID')}`}
            />
          </div>
        </>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
      >
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">{t('storageAnalytics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('serverCapacity')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSize(disk.total || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('used')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSize(disk.used || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('available')}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatSize(disk.free || 0)}</p>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usedPct, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-primary-500 rounded-full"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{usedPct}% {t('used')}</p>
      </motion.section>
    </div>
  );
}
