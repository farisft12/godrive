import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/axios';
import { formatSize } from '../../utils/fileIcons';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Pencil, Plus, Trash2 } from 'lucide-react';

function formatPrice(amount, currency = 'IDR') {
  if (currency === 'IDR' || !currency) return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toLocaleString()}`;
}

/** Harga dasar + pajak 11% - diskon % = Grand total per bulan (bulat) */
function getGrandTotalMonthly(priceAmount, discountPercent = 0) {
  const totalAfterTax = (Number(priceAmount) || 0) * 1.11;
  return Math.round(totalAfterTax * (1 - (Number(discountPercent) || 0) / 100));
}

function getGrandTotalYearly(priceYearly, discountPercent = 0) {
  if (priceYearly == null || priceYearly === '') return null;
  const totalAfterTax = Number(priceYearly) * 1.11;
  return Math.round(totalAfterTax * (1 - (Number(discountPercent) || 0) / 100));
}

export default function AdminPlansPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editPlan, setEditPlan] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    storage_bytes: 1073741824,
    price_amount: 0,
    price_currency: 'IDR',
    price_yearly: '',
    discount_percent: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => adminApi.getPlans(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      setEditPlan(null);
      toast.success(t('planUpdated'));
    },
    onError: (e) => toast.error(e.response?.data?.error || t('planCreateFailed')),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      setAddOpen(false);
      setForm({ name: '', storage_bytes: 1073741824, price_amount: 0, price_currency: 'IDR', price_yearly: '', discount_percent: 0 });
      toast.success(t('planAdded'));
    },
    onError: (e) => toast.error(e.response?.data?.error || t('planAddFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast.success(t('planDeleted'));
    },
    onError: (e) => toast.error(e.response?.data?.error || t('planDeleteFailed')),
  });

  const plans = data?.plans ?? [];

  const handleEdit = (plan) => {
    setEditPlan({
      id: plan.id,
      name: plan.name,
      storage_bytes: plan.storage_bytes,
      price_amount: plan.price_amount ?? 0,
      price_currency: plan.price_currency || 'IDR',
      price_yearly: plan.price_yearly ?? '',
      discount_percent: plan.discount_percent ?? 0,
    });
  };

  const handleSaveEdit = () => {
    if (!editPlan?.id) return;
    updateMutation.mutate({
      id: editPlan.id,
      data: {
        name: editPlan.name,
        storage_bytes: editPlan.storage_bytes,
        price_amount: editPlan.price_amount,
        price_currency: editPlan.price_currency,
        price_yearly: editPlan.price_yearly || null,
        discount_percent: editPlan.discount_percent,
      },
    });
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast.error(t('planNameRequired'));
      return;
    }
    createMutation.mutate({
      ...form,
      price_yearly: form.price_yearly === '' ? null : Number(form.price_yearly) || null,
    });
  };

  const handleDelete = (plan) => {
    if (!window.confirm(t('deletePlanConfirm'))) return;
    deleteMutation.mutate(plan.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('adminPlans')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('plansPageDesc')}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" /> {t('addPlan')}
        </button>
      </div>

      {isLoading ? (
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const base = plan.price_amount ?? 0;
            const tax = base * 0.11;
            const totalAfterTax = base * 1.11;
            const discountPct = plan.discount_percent ?? 0;
            const grandTotal = getGrandTotalMonthly(base, discountPct);
            const grandYearly = getGrandTotalYearly(plan.price_yearly, discountPct);
            return (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {(plan.discount_percent || 0) > 0 && (
                <span className="inline-block px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium mb-2 w-fit">
                  {t('discount')} {plan.discount_percent}%
                </span>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
              <p className="text-2xl font-semibold text-primary-600 dark:text-primary-400 mt-2">{formatSize(plan.storage_bytes)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('storageQuotaLabel')}</p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  Harga: {formatPrice(base, plan.price_currency)}/bln
                </p>
                <p className="text-gray-500 dark:text-gray-500">
                  Pajak 11%: {formatPrice(tax, plan.price_currency)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Total: {formatPrice(totalAfterTax, plan.price_currency)}
                </p>
                <p className="text-primary-600 dark:text-primary-400 font-semibold">
                  Grand total: {formatPrice(grandTotal, plan.price_currency)}/bln
                </p>
              </div>
              {grandYearly != null && grandYearly > 0 && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                  {formatPrice(grandYearly, plan.price_currency)}/tahun
                </p>
              )}
              <button
                type="button"
                onClick={() => handleEdit(plan)}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Pencil className="w-4 h-4" /> {t('edit')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(plan)}
                disabled={deleteMutation.isPending}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {t('delete')}
              </button>
            </div>
          );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('editPlan')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={editPlan.name}
                  onChange={(e) => setEditPlan((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('storageBytes')}</label>
                <input
                  type="number"
                  value={editPlan.storage_bytes}
                  onChange={(e) => setEditPlan((p) => ({ ...p, storage_bytes: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga (/bulan)</label>
                <input
                  type="number"
                  value={editPlan.price_amount}
                  onChange={(e) => setEditPlan((p) => ({ ...p, price_amount: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm space-y-1">
                  <p className="text-gray-600 dark:text-gray-400">Pajak 11%: {formatPrice((editPlan.price_amount || 0) * 0.11, editPlan.price_currency)}</p>
                  <p className="text-gray-700 dark:text-gray-300">Total: {formatPrice((editPlan.price_amount || 0) * 1.11, editPlan.price_currency)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('discountPercent')}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editPlan.discount_percent}
                  onChange={(e) => setEditPlan((p) => ({ ...p, discount_percent: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <p className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                  Grand total: {formatPrice(getGrandTotalMonthly(editPlan.price_amount, editPlan.discount_percent), editPlan.price_currency)}/bln
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('currency')}</label>
                <input
                  type="text"
                  value={editPlan.price_currency}
                  onChange={(e) => setEditPlan((p) => ({ ...p, price_currency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                  placeholder="IDR"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('yearlyPriceOptional')}</label>
                <input
                  type="number"
                  value={editPlan.price_yearly === '' || editPlan.price_yearly == null ? '' : editPlan.price_yearly}
                  onChange={(e) => setEditPlan((p) => ({ ...p, price_yearly: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                  placeholder=""
                />
                {editPlan.price_yearly != null && editPlan.price_yearly !== '' && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Grand total tahunan: {formatPrice(getGrandTotalYearly(editPlan.price_yearly, editPlan.discount_percent), editPlan.price_currency)}/tahun
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditPlan(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('addPlanModal')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('storageBytes')}</label>
                <input
                  type="number"
                  value={form.storage_bytes}
                  onChange={(e) => setForm((p) => ({ ...p, storage_bytes: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga (/bulan)</label>
                <input
                  type="number"
                  value={form.price_amount}
                  onChange={(e) => setForm((p) => ({ ...p, price_amount: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm space-y-1">
                  <p className="text-gray-600 dark:text-gray-400">Pajak 11%: {formatPrice((form.price_amount || 0) * 0.11, form.price_currency)}</p>
                  <p className="text-gray-700 dark:text-gray-300">Total: {formatPrice((form.price_amount || 0) * 1.11, form.price_currency)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('discountPercent')}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount_percent}
                  onChange={(e) => setForm((p) => ({ ...p, discount_percent: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
                <p className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                  Grand total: {formatPrice(getGrandTotalMonthly(form.price_amount, form.discount_percent), form.price_currency)}/bln
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('currency')}</label>
                <input
                  type="text"
                  value={form.price_currency}
                  onChange={(e) => setForm((p) => ({ ...p, price_currency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('yearlyPriceOptional')}</label>
                <input
                  type="number"
                  value={form.price_yearly}
                  onChange={(e) => setForm((p) => ({ ...p, price_yearly: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                />
                {form.price_yearly !== '' && Number(form.price_yearly) > 0 && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Grand total tahunan: {formatPrice(getGrandTotalYearly(form.price_yearly, form.discount_percent), form.price_currency)}/tahun
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={createMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? t('adding') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
