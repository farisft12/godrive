import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumbs from '../components/Breadcrumbs';
import FileGrid from '../components/FileGrid';
import UploadModal from '../components/UploadModal';
import ShareModal from '../components/ShareModal';
import FilePreview from '../components/FilePreview';
import FileInfoPanel from '../components/FileInfoPanel';
import RenameModal from '../components/RenameModal';
import MoveModal from '../components/MoveModal';
import NewFolderModal from '../components/NewFolderModal';
import { useUpload } from '../context/UploadContext';
import { Download, Share2, FolderInput, Trash2, X } from 'lucide-react';
import {
  foldersApi,
  filesApi,
  searchApi,
  shareApi,
} from '../services/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const { folderId } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const { setOnUploaded } = useUpload();
  const [view, setView] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadModalFiles, setUploadModalFiles] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [renameType, setRenameType] = useState('file');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveItems, setMoveItems] = useState([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const lastClickedIndexRef = useRef(null);

  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () => foldersApi.list(),
  });
  const folders = foldersData?.folders ?? [];

  const { data: filesData, refetch: refetchFiles } = useQuery({
    queryKey: ['files', folderId || null],
    queryFn: () => filesApi.list(folderId || null, false),
  });
  const files = filesData?.files ?? [];

  const { data: searchData } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchApi.search(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const { data: sharesData } = useQuery({
    queryKey: ['shares'],
    queryFn: () => shareApi.list(),
  });
  const sharedFileIds = new Set(sharesData?.file_ids ?? []);
  const sharedFolderIds = new Set(sharesData?.folder_ids ?? []);

  const breadcrumbFolders = [];
  let current = folders.find((f) => f.id === folderId);
  while (current) {
    breadcrumbFolders.unshift(current);
    current = folders.find((f) => f.id === current.parent_id);
  }

  const handleRename = useCallback(
    async (newName) => {
      if (!renameItem) return;
      try {
        if (renameType === 'file') {
          await filesApi.rename(renameItem.id, newName);
          toast.success('File renamed');
        } else {
          await foldersApi.update(renameItem.id, { name: newName });
          toast.success('Folder renamed');
        }
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        setRenameItem(null);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    },
    [renameItem, renameType, queryClient, toast]
  );

  const handleCreateFolder = () => {
    setShowNewFolderModal(true);
  };

  const handleCreateFolderSubmit = async (name) => {
    try {
      await foldersApi.create(name, folderId || null);
      toast.success('Folder created');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowNewFolderModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    setOnUploaded(() => {
      refetchFiles();
      refreshUser?.();
    });
    return () => setOnUploaded(null);
  }, [setOnUploaded, refetchFiles, refreshUser]);

  const displayFiles = searchQuery.length >= 2 ? searchData?.files ?? [] : files;
  const displayFolders =
    searchQuery.length >= 2
      ? searchData?.folders ?? []
      : folders.filter((f) => f.parent_id === (folderId || null));

  const allItems = [
    ...displayFolders.map((f) => ({ ...f, _type: 'folder' })),
    ...displayFiles.map((f) => ({ ...f, _type: 'file' })),
  ];

  const handleSelectFile = useCallback(
    (item, opts = {}) => {
      const id = item.id;
      const index = allItems.findIndex((x) => x.id === id);
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
        setSelectedIds(new Set(allItems.slice(from, to + 1).map((x) => x.id)));
      } else {
        setSelectedIds(new Set([id]));
        lastClickedIndexRef.current = index;
      }
    },
    [allItems]
  );

  const selectedFileIds = allItems.filter((x) => selectedIds.has(x.id) && x._type === 'file').map((x) => x.id);

  const handleBulkDelete = async () => {
    for (const id of selectedFileIds) {
      try {
        await filesApi.trash(id);
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    }
    setSelectedIds(new Set());
    refetchFiles();
    refreshUser?.();
    if (selectedFileIds.length > 0) toast.success('Moved to trash');
  };

  const handleBulkShare = () => {
    if (selectedIds.size !== 1) {
      toast.info('Select one file or folder to share');
      return;
    }
    const id = [...selectedIds][0];
    const file = displayFiles.find((f) => f.id === id);
    const folder = displayFolders.find((f) => f.id === id);
    if (file) {
      setShareFile({ ...file, _type: 'file' });
      setShowShare(true);
    } else if (folder) {
      setShareFile({ ...folder, _type: 'folder' });
      setShowShare(true);
    } else {
      toast.info('Select one file or folder to share');
    }
  };

  const handleBulkDownload = async () => {
    for (const id of selectedFileIds) {
      const file = displayFiles.find((f) => f.id === id);
      if (file) {
        try {
          await filesApi.download(id, file.original_name);
        } catch (err) {
          toast.error(err.message);
        }
      }
    }
    if (selectedFileIds.length > 0) toast.success('Download started');
  };

  const handleDropOnFolder = useCallback(
    async (targetFolderId, { fileIds = [], folderIds = [] }) => {
      const movingFolderIds = [...folderIds];
      const canMoveTo = (folderId) => {
        if (movingFolderIds.includes(folderId)) return false;
        const isDescendant = (descId, ancId) => {
          const f = folders.find((x) => x.id === descId);
          if (!f || !f.parent_id) return false;
          if (f.parent_id === ancId) return true;
          return isDescendant(f.parent_id, ancId);
        };
        for (const fid of movingFolderIds) {
          if (folderId === fid || isDescendant(folderId, fid)) return false;
        }
        return true;
      };
      if (!canMoveTo(targetFolderId)) {
        toast.error('Cannot move into that folder');
        return;
      }
      try {
        for (const id of fileIds) {
          await filesApi.move(id, targetFolderId);
        }
        for (const id of folderIds) {
          await foldersApi.update(id, { parent_id: targetFolderId });
        }
        refetchFiles();
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        setSelectedIds(new Set());
        const total = fileIds.length + folderIds.length;
        if (total > 0) toast.success('Moved successfully');
        refreshUser?.();
      } catch (err) {
        toast.error(err.response?.data?.error || err.message);
      }
    },
    [folders, refetchFiles, queryClient, toast, refreshUser]
  );

  const selectionToolbar =
    selectedIds.size > 0 ? (
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-primary-50 border-b border-primary-100">
        <span className="text-sm font-medium text-primary-800">{selectedIds.size} selected</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-2 rounded-lg hover:bg-primary-100 text-primary-700"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleBulkDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-primary-700 text-sm font-medium hover:bg-primary-100"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            type="button"
            onClick={handleBulkShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-primary-700 text-sm font-medium hover:bg-primary-100"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            type="button"
            onClick={() => {
              const items = allItems.filter((x) => selectedIds.has(x.id));
              setMoveItems(items);
              setShowMoveModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-primary-700 text-sm font-medium hover:bg-primary-100"
          >
            <FolderInput className="w-4 h-4" />
            Move
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    ) : null;

  return (
    <DashboardLayout
      sidebarFolders={folders}
      currentFolderId={folderId || null}
      uploadFolderId={folderId || null}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onUpload={() => setShowUpload(true)}
      onCreateFolder={handleCreateFolder}
      searchPlaceholder={t('searchFiles')}
    >
      <div className="flex flex-1 min-h-0 min-w-0">
        <div className="flex flex-1 flex-col min-h-0 min-w-0 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 shrink-0">
          <Breadcrumbs items={breadcrumbFolders} />
        </div>

        {searchQuery.length >= 2 && (
          <p className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-b border-gray-100">
            Search results for "{searchQuery}"
          </p>
        )}

        <FileGrid
          folders={displayFolders}
          files={displayFiles}
          view={view}
          onViewChange={setView}
          selectedIds={selectedIds}
          sharedFileIds={sharedFileIds}
          sharedFolderIds={sharedFolderIds}
          onSelectByRect={(ids) => setSelectedIds(new Set(ids))}
          onSelectFile={handleSelectFile}
          onPreview={setPreviewFile}
          onCreateFolder={handleCreateFolder}
          onPaste={() => toast.success('Paste will be available soon')}
          onShare={(file) => {
            setShareFile(file);
            setShowShare(true);
          }}
          onDelete={refetchFiles}
          onFileDelete={async (file) => {
            try {
              await filesApi.trash(file.id);
              toast.success('Moved to trash');
              refetchFiles();
              refreshUser?.();
            } catch (err) {
              toast.error(err.response?.data?.error || err.message);
            }
          }}
          onDownloadFile={async (file) => {
            try {
              await filesApi.download(file.id, file.original_name);
              toast.success('Download started');
            } catch (err) {
              toast.error(err.message || 'Download failed');
            }
          }}
          onRename={(item) => {
            setRenameItem(item);
            setRenameType(item.original_name != null ? 'file' : 'folder');
          }}
          onMove={(item) => {
            setMoveItems([{ ...item, _type: item.original_name != null ? 'file' : 'folder' }]);
            setShowMoveModal(true);
          }}
          onFolderDelete={async (folder) => {
            try {
              await foldersApi.delete(folder.id);
              toast.success('Folder deleted');
              refetchFiles();
              queryClient.invalidateQueries({ queryKey: ['folders'] });
              refreshUser?.();
            } catch (err) {
              toast.error(err.response?.data?.error || err.message);
            }
          }}
          onInformation={(file) => setSelectedFile(file)}
          selectionToolbar={selectionToolbar}
          onDropOnFolder={handleDropOnFolder}
          emptyMessage="No files or folders here yet."
          emptyAction={
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Upload files
            </button>
          }
        />
        </div>

        {selectedFile && selectedFile.original_name != null && (
        <FileInfoPanel
          file={selectedFile}
          filePath={
            breadcrumbFolders.length
              ? `My Files${breadcrumbFolders.map((f) => ` > ${f.name}`).join('')}`
              : 'My Files'
          }
          sharedFileIds={sharedFileIds}
          onClose={() => setSelectedFile(null)}
          onDeleted={() => {
            setSelectedFile(null);
            refetchFiles();
            refreshUser?.();
          }}
          onRename={(file) => {
            setRenameItem(file);
            setRenameType('file');
          }}
        />
      )}
      </div>

      <UploadModal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          setUploadModalFiles([]);
        }}
        folderId={folderId || null}
        onUploaded={() => {
          refetchFiles();
          refreshUser?.();
        }}
        initialFiles={uploadModalFiles}
        onFilesChange={setUploadModalFiles}
      />
      <ShareModal
        open={showShare}
        onClose={() => {
          setShowShare(false);
          setShareFile(null);
        }}
        file={shareFile}
        sharedFileIds={sharedFileIds}
        sharedFolderIds={sharedFolderIds}
        onShareCreated={() => queryClient.invalidateQueries({ queryKey: ['shares'] })}
      />
      <FilePreview
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onShare={(f) => {
          setShareFile(f);
          setShowShare(true);
        }}
      />
      <RenameModal
        open={!!renameItem}
        onClose={() => setRenameItem(null)}
        item={renameItem}
        type={renameType}
        onRename={handleRename}
      />
      <NewFolderModal
        open={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onSubmit={handleCreateFolderSubmit}
      />
      <MoveModal
        open={showMoveModal}
        onClose={() => { setShowMoveModal(false); setMoveItems([]); }}
        items={moveItems}
        excludeFolderId={folderId || undefined}
        onMove={() => {
          refetchFiles();
          queryClient.invalidateQueries({ queryKey: ['folders'] });
          setSelectedIds(new Set());
          refreshUser?.();
          if (moveItems.length > 0) toast.success('Moved successfully');
        }}
      />
    </DashboardLayout>
  );
}
