import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import FileGrid from '../components/FileGrid';
import ConfirmModal from '../components/ConfirmModal';
import { filesApi } from '../services/axios';
import { useFiles } from '../hooks/useFiles';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FolderInput, Trash2, X } from 'lucide-react';

export default function Trash() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, fileId: null });
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const lastClickedIndexRef = useRef(null);

  const { files, refetch } = useFiles(null, true);

  const handleSelectFile = useCallback(
    (item, opts = {}) => {
      const id = item.id;
      const index = files.findIndex((f) => f.id === id);
      if (opts.ctrlKey || opts.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        lastClickedIndexRef.current = index;
      } else if (opts.shiftKey) {
        const last = lastClickedIndexRef.current ?? 0;
        const from = Math.min(last, index);
        const to = Math.max(last, index);
        setSelectedIds(new Set(files.slice(from, to + 1).map((f) => f.id)));
      } else {
        setSelectedIds(new Set([id]));
        lastClickedIndexRef.current = index;
      }
    },
    [files]
  );

  const selectedFileIds = files.filter((f) => selectedIds.has(f.id)).map((f) => f.id);

  const handleRestore = async (id) => {
    try {
      await filesApi.restore(id);
      toast.success(t('restored'));
      queryClient.invalidateQueries({ queryKey: ['files'] });
      refetch();
      refreshUser?.();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleBulkRestore = async () => {
    for (const id of selectedFileIds) {
      try {
        await filesApi.restore(id);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['files'] });
    refetch();
    refreshUser?.();
    if (selectedFileIds.length > 0) toast.success(t('restored'));
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleBulkDeletePermanent = async () => {
    setBulkDeleteConfirm(false);
    for (const id of selectedFileIds) {
      try {
        await filesApi.delete(id);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['files'] });
    refetch();
    refreshUser?.();
    if (selectedFileIds.length > 0) toast.success(t('deletedPermanent'));
  };

  const handleEmptyTrash = async () => {
    setEmptyConfirm(false);
    const ids = files.map((f) => f.id);
    for (const id of ids) {
      try {
        await filesApi.delete(id);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['files'] });
    refetch();
    refreshUser?.();
    if (ids.length > 0) toast.success(t('deletedPermanent'));
  };

  const openDeleteConfirm = (id) => {
    setDeleteConfirm({ open: true, fileId: id });
  };

  const selectionToolbar =
    selectedIds.size > 0 ? (
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-primary-50 border-b border-primary-100">
        <span className="text-sm font-medium text-primary-800">{selectedIds.size} selected</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-2 rounded-lg hover:bg-primary-100 text-primary-700"
            title={t('cancel')}
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleBulkRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-primary-700 text-sm font-medium hover:bg-primary-100"
          >
            <FolderInput className="w-4 h-4" />
            {t('restore')}
          </button>
          <button
            type="button"
            onClick={() => selectedFileIds.length > 0 && setBulkDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            {t('deletePermanent')}
          </button>
        </div>
      </div>
    ) : files.length > 0 ? (
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setEmptyConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
          {t('emptyTrash')}
        </button>
      </div>
    ) : null;

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
          selectedIds={selectedIds}
          onSelectFile={handleSelectFile}
          selectionToolbar={selectionToolbar}
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
        <ConfirmModal
          open={emptyConfirm}
          title={t('emptyTrash')}
          message={t('emptyTrashConfirm')}
          confirmLabel={t('deletePermanent')}
          cancelLabel={t('cancel')}
          onConfirm={handleEmptyTrash}
          onCancel={() => setEmptyConfirm(false)}
        />
        <ConfirmModal
          open={bulkDeleteConfirm}
          title="Permanently delete selected files?"
          message={`${selectedFileIds.length} file(s) will be removed permanently. This cannot be undone.`}
          confirmLabel={t('deletePermanent')}
          cancelLabel={t('cancel')}
          onConfirm={handleBulkDeletePermanent}
          onCancel={() => setBulkDeleteConfirm(false)}
        />
      </div>
    </DashboardLayout>
  );
}
