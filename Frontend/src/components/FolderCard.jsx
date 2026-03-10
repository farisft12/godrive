import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Share2 } from 'lucide-react';
import { formatDate } from '../utils/fileIcons';
import FileActionMenu from './FileActionMenu';
import { useLongPress } from '../hooks/useLongPress';
import clsx from 'clsx';

const DRAG_MOVE_TYPE = 'application/x-godrive-move';

export default function FolderCard({
  folder,
  view = 'grid',
  selected,
  onSelect,
  onOpenContextMenu,
  onRename,
  onMove,
  onDelete,
  onInformation,
  onDragStartMove,
  onDropOnFolder,
  onShare,
  isShared = false,
}) {
  const isGrid = view === 'grid';
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(folder, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey });
    }
  };

  const handleDragOver = (e) => {
    if (!onDropOnFolder || !e.dataTransfer.types.includes(DRAG_MOVE_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    setIsDragOver(false);
    if (!onDropOnFolder || !e.dataTransfer.types.includes(DRAG_MOVE_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = e.dataTransfer.getData(DRAG_MOVE_TYPE);
      const payload = raw ? JSON.parse(raw) : { fileIds: [], folderIds: [] };
      onDropOnFolder(folder.id, payload);
    } catch (_) {}
  };

  const handleOpenContextMenuAt = useCallback(
    (x, y) => {
      onOpenContextMenu?.({ clientX: x, clientY: y, preventDefault: () => {} }, folder, 'folder');
    },
    [folder, onOpenContextMenu]
  );
  const longPress = useLongPress(handleOpenContextMenuAt, 500);

  if (isGrid) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          'relative group',
          isDragOver && 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50/50'
        )}
        onContextMenu={(e) => onOpenContextMenu?.(e, folder, 'folder')}
        {...longPress}
        data-selectable-id={folder.id}
        draggable={!!onDragStartMove}
        onDragStart={(e) => onDragStartMove?.(e, folder.id, 'folder')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          role="button"
          tabIndex={0}
          className={clsx(
            'absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white hover:border-primary-400'
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect?.(folder, { ctrlKey: true });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect?.(folder, { ctrlKey: true });
            }
          }}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <Link
          to={`/dashboard/${folder.id}`}
          onClick={handleClick}
          className={clsx(
            'block rounded-xl border bg-white overflow-hidden transition-shadow',
            selected
              ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
              : 'border-gray-100 hover:shadow-lg hover:border-gray-200'
          )}
        >
          <div className="aspect-square flex flex-col items-center justify-center p-4 relative">
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <FolderOpen className="w-8 h-8 text-amber-600" />
            </div>
            {isShared && (
              <div className="absolute top-2 left-8 p-1 rounded-md bg-primary-100 text-primary-600" title="Shared">
                <Share2 className="w-4 h-4" />
              </div>
            )}
            <p className="text-sm font-medium text-gray-900 truncate w-full text-center px-1">
              {folder.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(folder.updated_at)}</p>
          </div>
        </Link>
        <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation">
          <FileActionMenu
              type="folder"
              onShare={() => onShare?.(folder)}
              onDownload={null}
              onMove={() => onMove?.(folder)}
              onRename={() => onRename?.(folder)}
              onDelete={() => onDelete?.(folder)}
              onInformation={() => onInformation?.(folder)}
              align="right"
            />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={clsx(
        'group',
        isDragOver && 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50/50 rounded-lg'
      )}
      onContextMenu={(e) => onOpenContextMenu?.(e, folder, 'folder')}
      {...longPress}
      data-selectable-id={folder.id}
      draggable={!!onDragStartMove}
      onDragStart={(e) => onDragStartMove?.(e, folder.id, 'folder')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
          selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white hover:border-primary-400'
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect?.(folder, { ctrlKey: true });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(folder, { ctrlKey: true });
          }
        }}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <Link
        to={`/dashboard/${folder.id}`}
        onClick={handleClick}
      className={clsx(
        'group flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors',
        selected ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-gray-50'
      )}
      >
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 relative">
          {isShared && (
            <span className="absolute -top-0.5 -right-0.5 text-primary-600" title="Shared">
              <Share2 className="w-3.5 h-3.5" />
            </span>
          )}
          <FolderOpen className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{folder.name}</p>
          <p className="text-xs text-gray-500">{formatDate(folder.updated_at)}</p>
        </div>
        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 touch-manipulation">
          <FileActionMenu
            type="folder"
            onShare={() => onShare?.(folder)}
            onDownload={null}
            onMove={() => onMove?.(folder)}
            onRename={() => onRename?.(folder)}
            onDelete={() => onDelete?.(folder)}
            onInformation={() => onInformation?.(folder)}
            align="left"
          />
        </div>
      </Link>
    </motion.div>
  );
}
