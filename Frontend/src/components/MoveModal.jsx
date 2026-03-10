import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { foldersApi, filesApi } from '../services/axios';
import clsx from 'clsx';

function buildTree(folders, parentId = null) {
  return folders
    .filter((f) => (parentId == null ? f.parent_id == null : f.parent_id === parentId))
    .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
}

export default function MoveModal({ open, onClose, items = [], onMove, excludeFolderId }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedFolderId(null);
    foldersApi
      .listAll()
      .then((d) => setFolders(d.folders || []))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, [open]);

  const tree = buildTree(folders);
  const canMoveTo = (folderId) => {
    if (!items.length) return true;
    const folderIds = items.filter((i) => i._type === 'folder').map((i) => i.id);
    if (folderIds.includes(folderId)) return false;
    const isDescendant = (descId, ancId) => {
      const f = folders.find((x) => x.id === descId);
      if (!f || !f.parent_id) return false;
      if (f.parent_id === ancId) return true;
      return isDescendant(f.parent_id, ancId);
    };
    for (const fid of folderIds) {
      if (folderId === fid || isDescendant(folderId, fid)) return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (submitting || items.length === 0) return;
    setSubmitting(true);
    try {
      for (const item of items) {
        if (item._type === 'file') {
          await filesApi.move(item.id, selectedFolderId);
        } else {
          await foldersApi.update(item.id, { parent_id: selectedFolderId });
        }
      }
      onMove?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderFolder = (folder, depth = 0) => {
    const children = folders.filter((f) => f.parent_id === folder.id);
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const disabled = !canMoveTo(folder.id) || folder.id === excludeFolderId;

    return (
      <div key={folder.id} className="select-none">
        <div
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          className={clsx(
            'flex items-center gap-2 py-2 px-2 rounded-lg text-sm cursor-pointer transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
            isSelected && !disabled && 'bg-primary-100 text-primary-800',
            !disabled && !isSelected && 'hover:bg-gray-100'
          )}
          onClick={() => !disabled && setSelectedFolderId(folder.id)}
        >
          <button
            type="button"
            className="p-0.5 rounded hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              if (children.length) toggleExpand(folder.id);
            }}
          >
            {children.length ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <span className="w-4 inline-block" />
            )}
          </button>
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">{folder.name}</span>
        </div>
        {children.length > 0 && isExpanded && (
          <div>{children.map((f) => renderFolder(f, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (!open) return null;

  const modal = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40"
          aria-hidden
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Move to folder</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-3 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={clsx(
                'flex items-center gap-2 py-2 px-2 rounded-lg text-sm w-full text-left transition-colors',
                selectedFolderId === null ? 'bg-primary-100 text-primary-800' : 'hover:bg-gray-100'
              )}
            >
              <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
              My Files (root)
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 min-h-0">
            {loading ? (
              <p className="text-sm text-gray-500 py-4">Loading folders...</p>
            ) : (
              tree.map((f) => renderFolder(f))
            )}
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || items.length === 0}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Moving...' : 'Move here'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
