import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { usersApi, systemApi } from '../services/axios';
import { formatSize } from '../utils/fileIcons';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import SettingsTabs from '../components/settings/SettingsTabs';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState(() => lang);
  const [timezone, setTimezone] = useState(() => localStorage.getItem('godrive_timezone') || 'UTC');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifShare, setNotifShare] = useState(true);
  const [notifUpload, setNotifUpload] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [allowPublicLinks, setAllowPublicLinks] = useState(true);
  const [linkExpiration, setLinkExpiration] = useState('7');
  const [requirePassword, setRequirePassword] = useState(false);
  const [theme, setTheme] = useState('system');

  const { data: profile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
  });

  const { data: storage } = useQuery({
    queryKey: ['system', 'storage'],
    queryFn: () => systemApi.storage(),
    enabled: user?.role === 'admin',
  });

  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const used = user?.storage_used ?? 0;
  const quota = user?.storage_quota ?? 1;
  const percent = quota ? Math.round((used / quota) * 100) : 0;

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersApi.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'profile'], data);
      refreshUser();
      toast.success(t('settingsSaved'));
    },
    onError: (e) => toast.error(e.response?.data?.error || t('saveFailed')),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ current_password, new_password }) =>
      usersApi.changePassword(current_password, new_password),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('passwordUpdated'));
    },
    onError: (e) => toast.error(e.response?.data?.error || t('failed')),
  });

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({ name, email, phone });
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('passwordMinLength'));
      return;
    }
    changePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
  };

  const tabContent = (
    <AnimatePresence mode="wait">
      {activeTab === 'general' && (
        <motion.div
          key="general"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900 mb-4">{t('general')}</h2>
          <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
              <p className="text-sm text-gray-900 capitalize py-2">{user?.role || 'user'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('language')}</label>
              <select
                value={language}
                onChange={(e) => {
                  const v = e.target.value;
                  setLanguage(v);
                  setLang(v);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="en">{t('english')}</option>
                <option value="id">{t('bahasaIndonesia')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('timezone')}</label>
              <select
                value={timezone}
                onChange={(e) => {
                  const v = e.target.value;
                  setTimezone(v);
                  localStorage.setItem('godrive_timezone', v);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="UTC">UTC</option>
                <option value="Asia/Jakarta">Asia/Jakarta</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {t('save')}
            </button>
          </form>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div
          key="security"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6"
        >
          <h2 className="font-medium text-gray-900">{t('security')}</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <p className="text-sm text-gray-500">{t('changePasswordDesc')}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {t('updatePassword')}
            </button>
          </form>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Two-factor authentication (2FA)</p>
            <p className="text-sm text-gray-500 mb-2">Add an extra layer of security.</p>
            <button type="button" className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Enable 2FA
            </button>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Active sessions</p>
            <p className="text-sm text-gray-500">Current device. Log out other sessions from the Profile page or by changing your password.</p>
          </div>
        </motion.div>
      )}

      {activeTab === 'notifications' && (
        <motion.div
          key="notifications"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900 mb-4">{t('notifications')}</h2>
          <div className="space-y-4 max-w-md">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Email when someone shares a file with you</span>
              <input type="checkbox" checked={notifShare} onChange={(e) => setNotifShare(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Upload complete notification</span>
              <input type="checkbox" checked={notifUpload} onChange={(e) => setNotifUpload(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Security alerts</span>
              <input type="checkbox" checked={notifSecurity} onChange={(e) => setNotifSecurity(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </label>
          </div>
        </motion.div>
      )}

      {activeTab === 'sharing' && (
        <motion.div
          key="sharing"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900 mb-4">{t('sharing')}</h2>
          <div className="space-y-4 max-w-md">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Allow public links</span>
              <input type="checkbox" checked={allowPublicLinks} onChange={(e) => setAllowPublicLinks(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default link expiration (days)</label>
              <select value={linkExpiration} onChange={(e) => setLinkExpiration(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">No expiration</option>
              </select>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Require password for shared links by default</span>
              <input type="checkbox" checked={requirePassword} onChange={(e) => setRequirePassword(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            </label>
          </div>
        </motion.div>
      )}

      {activeTab === 'storage' && (
        <motion.div
          key="storage"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900 mb-4">{t('storage')}</h2>
          <div className="space-y-4 max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('total')}</span>
              <span className="font-medium text-gray-900">{formatSize(quota)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('used')}</span>
              <span className="font-medium text-gray-900">{formatSize(used)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('remaining')}</span>
              <span className="font-medium text-gray-900">{formatSize(Math.max(0, quota - used))}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            <button type="button" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
              {t('requestStorageUpgrade')}
            </button>
          </div>
          {storage && user?.role === 'admin' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">System storage (admin)</h3>
              <p className="text-sm text-gray-600">
                Disk: {formatSize(storage.used)} / {formatSize(storage.total)} ({storage.usage_percent}%)
              </p>
              {storage.warning && <p className="text-amber-600 text-sm mt-1">Storage usage is high. Consider upgrading.</p>}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'appearance' && (
        <motion.div
          key="appearance"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
        >
          <h2 className="font-medium text-gray-900 mb-4">{t('appearance')}</h2>
          <div className="space-y-3 max-w-md">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input type="radio" name="theme" checked={theme === 'light'} onChange={() => setTheme('light')} className="text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">Light mode</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input type="radio" name="theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} className="text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">Dark mode</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input type="radio" name="theme" checked={theme === 'system'} onChange={() => setTheme('system')} className="text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">System theme</span>
            </label>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onMenuClick={() => {}} />
      <div className="flex flex-1 min-h-0">
        <Sidebar folders={[]} currentFolderId={null} open={false} onClose={() => {}} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('settings')}</h1>
            <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab}>
              {tabContent}
            </SettingsTabs>
          </div>
        </main>
      </div>
    </div>
  );
}
