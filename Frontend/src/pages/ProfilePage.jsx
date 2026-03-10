import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/axios';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import ProfileCard from '../components/profile/ProfileCard';
import StorageChart from '../components/profile/StorageChart';

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => usersApi.getProfile(),
    enabled: !!authUser,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersApi.updateProfile(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'profile'], data);
      refreshUser();
      toast.success(t('profileUpdated'));
    },
    onError: (e) => toast.error(e.response?.data?.error || t('updateFailed')),
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
    onError: (e) => toast.error(e.response?.data?.error || t('failedToUpdatePassword')),
  });

  const handleSaveProfile = (e) => {
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onMenuClick={() => {}} />
      <div className="flex flex-1 min-h-0">
        <Sidebar folders={[]} currentFolderId={null} open={false} onClose={() => {}} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('profile')}</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <ProfileCard user={profile || authUser} />
                <div className="mt-6">
                  <StorageChart
                    used={profile?.storage_used ?? authUser?.storage_used ?? 0}
                    total={profile?.storage_quota ?? authUser?.storage_quota ?? 1}
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
                >
                  <h2 className="font-medium text-gray-900 mb-4">{t('accountInformation')}</h2>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('optional')}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {updateProfileMutation.isPending ? t('saving') : t('saveChanges')}
                    </button>
                  </form>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
                >
                  <h2 className="font-medium text-gray-900 mb-4">{t('security')}</h2>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('currentPassword')}</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('newPassword')}</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')}</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                      className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {changePasswordMutation.isPending ? t('updating') : t('updatePassword')}
                    </button>
                  </form>
                </motion.section>

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
