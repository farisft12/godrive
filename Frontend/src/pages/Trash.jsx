import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import FileGrid from '../components/FileGrid';
import ConfirmModal from '../components/ConfirmModal';
import { filesApi } from '../services/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Trash() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, fileId: null });

  const { data, refetch } = useQuery({
    queryKey: ['files', 'trash'],
    queryFn: () => filesApi.list(null, true),
  });
  const files = data?.files ?? [];

  const handleRestore = async (id) => {
    try {
      await filesApi.restore(id);
      toast.success(t('restored'));
      queryClient.invalidateQueries({ queryKey: ['files'] });
      refetch();
      refreshUser?.();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleDeletePermanent = async () => {
    const id = deleteConfirm.fileId;
    if (!id) return;
    setDeleteConfirm({ open: false, fileId: null });
    try {
      await filesApi.delete(id);
      toast.success(t('deletedPermanent'));
      refetch();
      refreshUser?.();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const openDeleteConfirm = (id) => {
    setDeleteConfirm({ open: true, fileId: id });
  };

  return (
    <DashboardLayout
      sidebarFolders={[]}
      currentFolderId={null}
      searchQuery=""
      onSearchChange={() => {}}
      onUpload={() => {}}
      onCreateFolder={() => {}}
      searchPlaceholder={t('searchFiles')}
    >
      <div className="flex flex-1 flex-col min-h-0 bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-xl font-semibold text-gray-900">{t('trash')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('trashDescription')}
          </p>
        </div>
        <FileGrid
          folders={[]}
          files={files}
          view="grid"
          trashView
          onRestore={handleRestore}
          onDeletePermanent={openDeleteConfirm}
          onDownloadFile={async (file) => {
            try {
              await filesApi.download(file.id, file.original_name);
              toast.success('Download started');
            } catch (err) {
              toast.error(err.message || 'Download failed');
            }
          }}
          onDelete={refetch}
          emptyMessage="Trash is empty."
        />
        <ConfirmModal
          open={deleteConfirm.open}
          title="Permanently delete this file?"
          message="This cannot be undone. The file will be removed permanently."
          confirmLabel="Delete permanently"
          cancelLabel="Cancel"
          onConfirm={handleDeletePermanent}
          onCancel={() => setDeleteConfirm({ open: false, fileId: null })}
        />
      </div>
    </DashboardLayout>
  );
}
