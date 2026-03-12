import { useState, useCallback, useEffect } from 'react';
import { X, Share2, Copy, Users } from 'lucide-react';
import { formatSize, formatDate, getFileIconComponent } from '../utils/fileIcons';
import { filesApi, shareApi } from '../services/axios';
import { useToast } from '../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

export default function FileInfoPanel({ file, filePath, sharedFileIds, onClose, onDeleted, onRename }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [copyingLink, setCopyingLink] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!file?.id || !sharedFileIds?.has(file.id)) {
      setCollaborators([]);
      return;
    }
    shareApi
      .getByFile(file.id)
      .then((data) => {
        if (data.share_id) return shareApi.getCollaborators(data.share_id);
        return { collaborators: [] };
      })
      .then((data) => setCollaborators(data?.collaborators || []))
      .catch(() => setCollaborators([]));
  }, [file?.id, sharedFileIds]);

  const handleCopyLink = useCallback(async () => {
    if (!file?.id || !sharedFileIds?.has(file.id)) return;
    setCopyingLink(true);
    try {
      const { token } = await shareApi.getByFile(file.id);
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not get share link');
    } finally {
      setCopyingLink(false);
    }
  }, [file?.id, sharedFileIds, toast]);

  if (!file) return null;

  const Icon = getFileIconComponent(file.mime_type, file.original_name);
  const isShared = sharedFileIds?.has(file.id);

  const handleDownload = async () => {
    try {
      await filesApi.download(file.id, file.original_name);
      toast.success('Download started');
    } catch (e) {
      toast.error(e.message || 'Download failed');
    }
  };

  const handleTrash = async () => {
    try {
      await filesApi.trash(file.id);
      toast.success('Moved to trash');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      onDeleted?.();
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className="w-80 min-w-[320px] max-w-[90vw] h-full min-h-0 flex flex-col bg-white border-l border-gray-200 shrink-0 shadow-xl rounded-l-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-semibold text-gray-900 truncate">Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* File preview & name */}
        <div className="p-5 border-b border-gray-100 shrink-0">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 shadow-inner shrink-0">
              <Icon className="w-10 h-10 text-gray-600 shrink-0" />
            </div>
            <p className="font-medium text-gray-900 break-words text-sm leading-snug w-full px-1">
              {file.original_name}
            </p>
          </div>
        </div>

        {/* Properties */}
        <div className="p-4 space-y-4">
          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Properties
            </h4>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 shrink-0">Size</dt>
                <dd className="font-medium text-gray-900 text-right truncate min-w-0">{formatSize(file.size_bytes)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 shrink-0">Uploaded</dt>
                <dd className="font-medium text-gray-900 text-right truncate min-w-0">
                  {formatDate(file.created_at || file.updated_at)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 shrink-0">Modified</dt>
                <dd className="font-medium text-gray-900 text-right truncate min-w-0">{formatDate(file.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 shrink-0">Owner</dt>
                <dd className="font-medium text-gray-900 text-right">Me</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-gray-500 mb-1">Path</dt>
                <dd className="font-medium text-gray-700 text-xs break-words">{filePath || 'My Files'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 shrink-0">Type</dt>
                <dd className="font-medium text-gray-900 text-right truncate min-w-0 max-w-[140px]">
                  {file.mime_type || 'Unknown'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Sharing */}
          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Sharing
            </h4>
            {isShared ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary-600 shrink-0" />
                  <span className="min-w-0">This file is shared</span>
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={copyingLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors disabled:opacity-50"
                >
                  <Copy className="w-4 h-4 shrink-0" />
                  {copyingLink ? 'Copying...' : 'Copy link'}
                </button>
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Siapa yang punya akses
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>Siapa pun dengan link: Lihat</li>
                    {collaborators.map((c) => (
                      <li key={c.id}>
                        {c.user_name || c.email} — {c.role === 'edit' ? 'Edit' : 'Lihat'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not shared</p>
            )}
          </section>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2 bg-gray-50/30 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => onRename?.(file)}
            className="w-full py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={handleTrash}
            className="w-full py-2.5 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Move to trash
          </button>
        </div>
      </div>
    </div>
  );
}
