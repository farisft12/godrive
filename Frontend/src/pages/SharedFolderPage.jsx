import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LayoutGrid, List } from 'lucide-react';
import SharedTopbar from '../components/shared/SharedTopbar';
import SharedFolderHeader from '../components/shared/SharedFolderHeader';
import SharedFileGrid from '../components/shared/SharedFileGrid';
import SharedFolderCard from '../components/shared/SharedFolderCard';
import SharedPreviewModal from '../components/shared/SharedPreviewModal';
import SharedContextMenu from '../components/shared/SharedContextMenu';
import SharedUploadPopup from '../components/shared/SharedUploadPopup';
import JSZip from 'jszip';
import { formatDate } from '../utils/fileIcons';
import { shareApi, filesApi } from '../services/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SharedFolderPage({
  shareInfo,
  token,
  password = '',
  allowUpload = false,
  onNavigateFolder,
  onRefreshShareInfo,
}) {
  const [previewFile, setPreviewFile] = useState(null);
  const [downloadAllLoading, setDownloadAllLoading] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [view, setView] = useState('grid');
  const [contextMenu, setContextMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collaborators, setCollaborators] = useState([]);

  const { user } = useAuth();
  const toast = useToast();
  const isLoggedIn = !!user;

  const files = shareInfo?.files || [];
  const folders = shareInfo?.folders || [];
  const filteredFiles = searchQuery.trim()
    ? files.filter((f) =>
        (f.original_name || '')
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
    : files;
  const breadcrumb = shareInfo?.breadcrumb || [];

  useEffect(() => {
    if (!shareInfo?.share_id || !user?.id || shareInfo.owner_id !== user.id) {
      setCollaborators([]);
      return;
    }
    shareApi
      .getCollaborators(shareInfo.share_id)
      .then((data) => setCollaborators(data.collaborators || []))
      .catch(() => setCollaborators([]));
  }, [shareInfo?.share_id, shareInfo?.owner_id, user?.id]);

  const folderName = shareInfo?.folder_name || 'Shared folder';
  const currentFolderName = shareInfo?.current_folder_name ?? folderName;
  const totalSize = files.reduce((sum, f) => sum + (Number(f.size_bytes) || 0), 0);
  const passwordQ = password ? `&password=${encodeURIComponent(password)}` : '';

  const handleDownloadFile = useCallback(
    (file) => {
      const url = `${API_BASE}/api/share/${token}/download?file_id=${file.file_id}${passwordQ}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name || 'download';
      a.click();
    },
    [token, passwordQ]
  );

  const handleOpenContextMenu = useCallback((e, file) => {
    e?.preventDefault?.();
    setContextMenu({ file, x: e.clientX, y: e.clientY });
  }, []);

  const handleSaveToDrive = useCallback(
    async (file) => {
      setContextMenu(null);
      try {
        const url = `${API_BASE}/api/share/${token}/download?file_id=${file.file_id}${passwordQ}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengunduh file');
        const blob = await res.blob();
        const fileObj = new File([blob], file.original_name || 'download', {
          type: file.mime_type || 'application/octet-stream',
        });
        const formData = new FormData();
        formData.append('file', fileObj);
        await filesApi.upload(formData);
        toast.success('File disimpan ke Drive Anda');
      } catch (e) {
        toast.error(e.response?.data?.error || e.message || 'Gagal menyimpan');
      }
    },
    [token, passwordQ, toast]
  );

  const handleDownloadAll = useCallback(async () => {
    if (files.length === 0) return;
    setDownloadAllLoading(true);
    try {
      const zip = new JSZip();
      const fetchPromises = files.map(async (f) => {
        const url = `${API_BASE}/api/share/${token}/download?file_id=${f.file_id}${passwordQ}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed: ${f.original_name}`);
        const blob = await res.blob();
        zip.file(f.original_name || `file-${f.file_id}`, blob);
      });
      await Promise.all(fetchPromises);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${folderName.replace(/[^a-z0-9-_]/gi, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadAllLoading(false);
    }
  }, [files, token, passwordQ, folderName]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setDragOver(false);
      if (!allowUpload || acceptedFiles.length === 0 || !onRefreshShareInfo) return;
      const currentFolderId = shareInfo?.current_folder_id ?? shareInfo?.folder_id;
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const id = `upload-${Date.now()}-${i}`;
        setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (currentFolderId) formData.append('folder_id', currentFolderId);
          await shareApi.uploadToShare(token, formData, password, (p) => {
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: p.percent ?? 0 } : u))
            );
          });
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, progress: 100, done: true } : u))
          );
          onRefreshShareInfo(currentFolderId);
        } catch {
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, done: true, error: true } : u))
          );
        }
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== id));
        }, 2500);
      }
    },
    [allowUpload, token, password, shareInfo?.current_folder_id, shareInfo?.folder_id, onRefreshShareInfo]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => allowUpload && setDragOver(true),
    onDragLeave: () => setDragOver(false),
    noClick: !allowUpload,
    noKeyboard: true,
    disabled: !allowUpload,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" {...(allowUpload ? getRootProps() : {})}>
      <input {...getInputProps()} />
      <SharedTopbar
        onDownloadAll={files.length > 0 ? handleDownloadAll : undefined}
        isDownloading={downloadAllLoading}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Cari file..."
      />

      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-6xl w-full mx-auto">
        <div className="space-y-5 sm:space-y-6">
          <SharedFolderHeader
            folderName={folderName}
            ownerName={shareInfo?.owner_name ?? 'GoDrive user'}
            fileCount={files.length}
            totalSize={totalSize}
            lastUpdated={
              shareInfo?.folder_updated_at
                ? formatDate(shareInfo.folder_updated_at)
                : null
            }
            collaborators={collaborators}
          />

          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
            {breadcrumb.length > 0 ? (
              breadcrumb.map((seg, i) => (
                <span key={seg.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  {i < breadcrumb.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => onNavigateFolder?.(seg.id)}
                      className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {seg.name}
                    </button>
                  ) : (
                    <span className="font-medium text-gray-900">{seg.name}</span>
                  )}
                </span>
              ))
            ) : (
              <span className="font-medium text-gray-900">{currentFolderName}</span>
            )}
          </nav>

          {/* View toggle + Upload: always visible so view works when folder has only subfolders */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-colors touch-manipulation ${
                  view === 'grid'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-colors touch-manipulation ${
                  view === 'list'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            {allowUpload && (
              <div className="flex justify-end">
              <input
                type="file"
                multiple
                className="hidden"
                id="shared-upload-input"
                onChange={async (e) => {
                  const list = e.target.files;
                  if (!list?.length || !onRefreshShareInfo) return;
                  e.target.value = '';
                  const currentFolderId = shareInfo?.current_folder_id ?? shareInfo?.folder_id;
                  for (let i = 0; i < list.length; i++) {
                    const file = list[i];
                    const id = `upload-${Date.now()}-${i}`;
                    setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      if (currentFolderId) formData.append('folder_id', currentFolderId);
                      await shareApi.uploadToShare(token, formData, password, (p) => {
                        setUploads((prev) =>
                          prev.map((u) => (u.id === id ? { ...u, progress: p.percent ?? 0 } : u))
                        );
                      });
                      setUploads((prev) =>
                        prev.map((u) => (u.id === id ? { ...u, progress: 100, done: true } : u))
                      );
                      onRefreshShareInfo(currentFolderId);
                    } catch {
                      setUploads((prev) =>
                        prev.map((u) => (u.id === id ? { ...u, done: true, error: true } : u))
                      );
                    }
                    setTimeout(() => {
                      setUploads((prev) => prev.filter((u) => u.id !== id));
                    }, 2500);
                  }
                }}
              />
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('shared-upload-input')?.click();
                }}
              >
                Upload files
              </button>
            </div>
            )}
          </div>

          {/* Folders */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
              </p>
              {view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {folders.map((folder) => (
                    <SharedFolderCard
                      key={folder.id}
                      folder={folder}
                      view="grid"
                      onOpen={onNavigateFolder}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {folders.map((folder) => (
                    <SharedFolderCard
                      key={folder.id}
                      folder={folder}
                      view="list"
                      onOpen={onNavigateFolder}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <SharedFileGrid
            files={filteredFiles}
            view={view}
            onViewChange={setView}
            onPreview={setPreviewFile}
            onDownload={handleDownloadFile}
            onOpenContextMenu={handleOpenContextMenu}
            token={token}
            passwordQ={passwordQ}
            emptyMessage={
              folders.length === 0 && files.length === 0
                ? 'This folder is empty.'
                : 'No files in this folder.'
            }
          />
        </div>
      </main>

      <SharedPreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        token={token}
        password={password}
      />

      <SharedContextMenu
        open={!!contextMenu}
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: 0, y: 0 }}
        file={contextMenu?.file ?? null}
        onClose={() => setContextMenu(null)}
        onOpen={() => {
          if (contextMenu?.file) setPreviewFile(contextMenu.file);
          setContextMenu(null);
        }}
        onDownload={() => {
          if (contextMenu?.file) handleDownloadFile(contextMenu.file);
          setContextMenu(null);
        }}
        onSaveToDrive={handleSaveToDrive}
        isLoggedIn={isLoggedIn}
      />

      {allowUpload && <SharedUploadPopup uploads={uploads} />}

      <AnimatePresence>
        {dragOver && allowUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border-2 border-dashed border-primary-400 px-8 py-6 text-center"
            >
              <p className="text-lg font-semibold text-gray-900">Drop files to upload</p>
              <p className="text-sm text-gray-500 mt-1">Release to add files to this folder</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
