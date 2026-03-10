import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Filter } from 'lucide-react';
import FileCard from './FileCard';
import FolderCard from './FolderCard';
import ContextMenu from './ContextMenu';
import clsx from 'clsx';

function rectsIntersect(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

const DRAG_MOVE_TYPE = 'application/x-godrive-move';

export default function FileGrid({
  folders = [],
  files = [],
  view = 'grid',
  onViewChange,
  selectedIds = new Set(),
  onSelectFile,
  onPreview,
  onShare,
  onDelete,
  onFolderDelete,
  onFileDelete,
  onDownloadFile,
  onRename,
  onMove,
  onInformation,
  trashView = false,
  onRestore,
  onDeletePermanent,
  emptyMessage = 'No files or folders here yet.',
  emptyAction,
  selectionToolbar,
  sharedFileIds = new Set(),
  sharedFolderIds = new Set(),
  onSelectByRect,
  onDropOnFolder,
  onCreateFolder,
  onPaste,
}) {
  const [sortBy, setSortBy] = useState('name');
  const [filterOpen, setFilterOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [dragSelect, setDragSelect] = useState(null);
  const contentRef = useRef(null);

  const sortedFolders = [...folders].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });
  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'name') return (a.original_name || '').localeCompare(b.original_name || '');
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);

  const handleOpenContextMenu = (e, item, type) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const handleContextMenuOnArea = (e) => {
    if (e.target.closest('[data-selectable-id]')) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'background', item: null });
  };

  useEffect(() => {
    if (!dragSelect || !onSelectByRect || !contentRef.current) return;
    const handleMove = (e) => {
      setDragSelect((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));
    };
    const handleUp = () => {
      setDragSelect((prev) => {
        if (!prev) return null;
        const left = Math.min(prev.startX, prev.currentX);
        const top = Math.min(prev.startY, prev.currentY);
        const right = Math.max(prev.startX, prev.currentX);
        const bottom = Math.max(prev.startY, prev.currentY);
        const selRect = { left, top, right, bottom };
        const nodes = contentRef.current.querySelectorAll('[data-selectable-id]');
        const ids = [];
        nodes.forEach((node) => {
          const r = node.getBoundingClientRect();
          if (rectsIntersect(selRect, r)) ids.push(node.getAttribute('data-selectable-id'));
        });
        queueMicrotask(() => onSelectByRect(ids));
        return null;
      });
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragSelect, onSelectByRect]);

  const handleAreaMouseDown = (e) => {
    if (!onSelectByRect) return;
    if (e.button !== 0) return;
    if (e.target.closest('[data-selectable-id]')) return;
    setDragSelect({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleDragStartMove = useCallback(
    (e, itemId, itemType) => {
      if (trashView || !onDropOnFolder) return;
      const payload = selectedSet.has(itemId)
        ? {
            fileIds: sortedFiles.filter((f) => selectedSet.has(f.id)).map((f) => f.id),
            folderIds: sortedFolders.filter((f) => selectedSet.has(f.id)).map((f) => f.id),
          }
        : {
            fileIds: itemType === 'file' ? [itemId] : [],
            folderIds: itemType === 'folder' ? [itemId] : [],
          };
      e.dataTransfer.setData(DRAG_MOVE_TYPE, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    },
    [trashView, onDropOnFolder, selectedSet, sortedFiles, sortedFolders]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {contextMenu && (
        <ContextMenu
          open
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          type={contextMenu.type}
          item={contextMenu.item}
          trashView={trashView}
          sortBy={sortBy}
          onSortChange={setSortBy}
          view={view}
          onViewChange={onViewChange}
          onCreateFolder={contextMenu.type === 'background' ? onCreateFolder : undefined}
          onPaste={contextMenu.type === 'background' ? onPaste : undefined}
          onDownload={contextMenu.type === 'file' ? () => onDownloadFile?.(contextMenu.item) : undefined}
          onShare={contextMenu.type === 'file' || contextMenu.type === 'folder' ? () => onShare?.(contextMenu.item) : undefined}
          onMove={() => onMove?.(contextMenu.item)}
          onRename={() => onRename?.(contextMenu.item)}
          onDelete={
            contextMenu.type === 'file'
              ? () => onFileDelete?.(contextMenu.item)
              : () => onFolderDelete?.(contextMenu.item)
          }
          onInformation={() => onInformation?.(contextMenu.item)}
          onRestore={contextMenu.type === 'file' ? () => onRestore?.(contextMenu.item.id) : undefined}
          onDeletePermanent={
            contextMenu.type === 'file' ? () => onDeletePermanent?.(contextMenu.item.id) : undefined
          }
        />
      )}
      {selectionToolbar}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 sm:px-3 py-2 sm:py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[40px] sm:min-h-0 touch-manipulation"
          >
            <option value="name">Name</option>
            <option value="modified">Modified</option>
          </select>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className={clsx(
              'p-2 rounded-lg transition-colors touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0',
              filterOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100'
            )}
            title="Filter"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onViewChange?.('grid')}
            className={clsx(
              'p-2 rounded-lg transition-colors touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0',
              view === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-100'
            )}
            title="Grid view"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange?.('list')}
            className={clsx(
              'p-2 rounded-lg transition-colors touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0',
              view === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-100'
            )}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-auto p-3 sm:p-4"
        onMouseDown={handleAreaMouseDown}
        onContextMenu={handleContextMenuOnArea}
      >
        {sortedFolders.length === 0 && sortedFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-gray-500"
          >
            <p className="mb-4">{emptyMessage}</p>
            {emptyAction}
          </motion.div>
        ) : (
          <>
            {dragSelect && (
              <div
                className="fixed border-2 border-primary-500 bg-primary-500/10 pointer-events-none z-[90]"
                style={{
                  left: Math.min(dragSelect.startX, dragSelect.currentX),
                  top: Math.min(dragSelect.startY, dragSelect.currentY),
                  width: Math.abs(dragSelect.currentX - dragSelect.startX),
                  height: Math.abs(dragSelect.currentY - dragSelect.startY),
                }}
              />
            )}
            {view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {sortedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                view={view}
                selected={selectedSet.has(folder.id)}
                onSelect={onSelectFile}
                onOpenContextMenu={handleOpenContextMenu}
                onRename={onRename}
                onMove={onMove}
                onDelete={() => onFolderDelete?.(folder)}
                onInformation={onInformation}
                onDragStartMove={handleDragStartMove}
                onDropOnFolder={onDropOnFolder}
                onShare={onShare}
                isShared={sharedFolderIds.has(folder.id)}
              />
            ))}
            {sortedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                view={view}
                selected={selectedSet.has(file.id)}
                onSelect={onSelectFile}
                onOpenContextMenu={handleOpenContextMenu}
                onPreview={onPreview}
                onShare={onShare}
                onDelete={onDelete}
                onRename={onRename}
                onMove={onMove}
                onInformation={onInformation}
                onRestore={onRestore}
                onDeletePermanent={onDeletePermanent}
                trashView={trashView}
                isShared={sharedFileIds.has(file.id)}
                onDragStartMove={handleDragStartMove}
              />
            ))}
            </div>
            ) : (
          <div className="flex flex-col gap-1">
            {sortedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                view={view}
                selected={selectedSet.has(folder.id)}
                onSelect={onSelectFile}
                onOpenContextMenu={handleOpenContextMenu}
                onRename={onRename}
                onMove={onMove}
                onDelete={() => onFolderDelete?.(folder)}
                onInformation={onInformation}
                onDragStartMove={handleDragStartMove}
                onDropOnFolder={onDropOnFolder}
                onShare={onShare}
                isShared={sharedFolderIds.has(folder.id)}
              />
            ))}
            {sortedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                view={view}
                selected={selectedSet.has(file.id)}
                onSelect={onSelectFile}
                onOpenContextMenu={handleOpenContextMenu}
                onPreview={onPreview}
                onShare={onShare}
                onDelete={onDelete}
                onRename={onRename}
                onMove={onMove}
                onInformation={onInformation}
                onRestore={onRestore}
                onDeletePermanent={onDeletePermanent}
                trashView={trashView}
                isShared={sharedFileIds.has(file.id)}
                onDragStartMove={handleDragStartMove}
              />
            ))}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
