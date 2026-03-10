import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { systemApi } from '../services/axios';
import { formatSize } from '../utils/fileIcons';

export default function Settings() {
  const { user } = useAuth();
  const { data: storage } = useQuery({
    queryKey: ['system', 'storage'],
    queryFn: () => systemApi.storage(),
    enabled: user?.role === 'admin',
  });

  const used = user?.storage_used ?? 0;
  const quota = user?.storage_quota ?? 1;
  const percent = quota ? Math.round((used / quota) * 100) : 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onMenuClick={() => {}} />
      <div className="flex flex-1 min-h-0">
        <Sidebar folders={[]} currentFolderId={null} open={false} onClose={() => {}} />
        <main className="flex-1 overflow-auto p-6 max-w-2xl">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

          <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-medium text-gray-900 mb-4">Profile</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{user?.email}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-medium text-gray-900 mb-4">Storage</h2>
            <p className="text-sm text-gray-600 mb-2">
              {formatSize(used)} of {formatSize(quota)} used
            </p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </section>

          {storage && user?.role === 'admin' && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-medium text-gray-900 mb-4">System storage</h2>
              <p className="text-sm text-gray-600">
                Disk: {formatSize(storage.used)} / {formatSize(storage.total)} ({storage.usage_percent}%)
              </p>
              {storage.warning && (
                <p className="text-amber-600 text-sm mt-2">Storage usage is high. Consider upgrading.</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
