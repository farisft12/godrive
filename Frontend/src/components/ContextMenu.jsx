import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  FolderInput,
  Pencil,
  Trash2,
  Info,
  FolderPlus,
  Check,
  ClipboardPaste,
  LayoutGrid,
  List,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ContextMenu({
  open,
  position = { x: 0, y: 0 },
  onClose,
  type = 'file',
  item,
  trashView = false,
  downloadingFileId = null,
  sortBy,
  onSortChange,
  view,
  onViewChange,
  onCreateFolder,
  onPaste,
  onDownload,
  onShare,
  onMove,
  onRename,
  onDelete,
  onInformation,
  onRestore,
  onDeletePermanent,
}) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = () => onClose();
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClick);
    };
  }, [open, onClose]);

  const handleAction = (fn) => {
    fn?.();
    onClose();
  };

  if (!open) return null;
  if (type !== 'background' && !item) return null;

  const padding = 8;
  const menuWidth = 192;
  const menuHeight = type === 'background' ? 320 : 280;
  const maxX = typeof window !== 'undefined' ? window.innerWidth - menuWidth - padding : position.x;
  const maxY = typeof window !== 'undefined' ? window.innerHeight - menuHeight - padding : position.y;
  const x = Math.max(padding, Math.min(position.x, maxX));
  const y = Math.max(padding, Math.min(position.y, maxY));

  const style = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 9999,
  };

  const btnClass =
    'flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation';

  const menu = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={style}
        className="w-48 py-1 bg-white rounded-xl shadow-lg border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'background' ? (
          <>
            {onCreateFolder && (
              <button type="button" onClick={() => handleAction(onCreateFolder)} className={btnClass}>
                <FolderPlus className="w-4 h-4 text-gray-500" />
                {t('newFolder')}
              </button>
            )}
            {onSortChange && (
              <>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 border-t border-gray-100 mt-1 pt-2">
                  {t('sortBy')}
                </div>
                <button type="button" onClick={() => handleAction(() => onSortChange('name'))} className={btnClass}>
                  {sortBy === 'name' ? <Check className="w-4 h-4 text-primary-600" /> : <span className="w-4" />}
                  {t('name')}
                </button>
                <button type="button" onClick={() => handleAction(() => onSortChange('modified'))} className={btnClass}>
                  {sortBy === 'modified' ? <Check className="w-4 h-4 text-primary-600" /> : <span className="w-4" />}
                  {t('sortByModified')}
                </button>
              </>
            )}
            {onViewChange && (
              <>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 border-t border-gray-100 mt-1 pt-2">
                  {t('view')}
                </div>
                <button type="button" onClick={() => handleAction(() => onViewChange('grid'))} className={btnClass}>
                  {view === 'grid' ? <Check className="w-4 h-4 text-primary-600" /> : <span className="w-4" />}
                  <LayoutGrid className="w-4 h-4 text-gray-500" />
                  {t('largeIcons')}
                </button>
                <button type="button" onClick={() => handleAction(() => onViewChange('list'))} className={btnClass}>
                  {view === 'list' ? <Check className="w-4 h-4 text-primary-600" /> : <span className="w-4" />}
                  <List className="w-4 h-4 text-gray-500" />
                  {t('listView')}
                </button>
              </>
            )}
            {onPaste && (
              <button type="button" onClick={() => handleAction(onPaste)} className={`${btnClass} border-t border-gray-100 mt-1 pt-2`}>
                <ClipboardPaste className="w-4 h-4 text-gray-500" />
                {t('paste')}
              </button>
            )}
          </>
        ) : trashView ? (
          <>
            <button
              type="button"
              onClick={() => handleAction(onDownload)}
              disabled={item?.id === downloadingFileId}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {item?.id === downloadingFileId ? (
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" aria-hidden />
              ) : (
                <Download className="w-4 h-4 text-gray-500" />
              )}
              {item?.id === downloadingFileId ? 'Downloading...' : 'Download'}
            </button>
            <button
              type="button"
              onClick={() => handleAction(onRestore)}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
            >
              <FolderInput className="w-4 h-4 text-gray-500" />
              Restore
            </button>
            <button
              type="button"
              onClick={() => handleAction(onDeletePermanent)}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-red-600 hover:bg-red-50 text-left touch-manipulation"
            >
              <Trash2 className="w-4 h-4" />
              Delete permanently
            </button>
          </>
        ) : (
          <>
            {type === 'file' && onDownload && (
              <button
                type="button"
                onClick={() => handleAction(onDownload)}
                disabled={item?.id === downloadingFileId}
                className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {item?.id === downloadingFileId ? (
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" aria-hidden />
                ) : (
                  <Download className="w-4 h-4 text-gray-500" />
                )}
                {item?.id === downloadingFileId ? 'Downloading...' : 'Download'}
              </button>
            )}
            {(type === 'file' || type === 'folder') && onShare && (
              <button
                type="button"
                onClick={() => handleAction(onShare)}
                className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
              >
                <Share2 className="w-4 h-4 text-gray-500" />
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAction(onMove)}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
            >
              <FolderInput className="w-4 h-4 text-gray-500" />
              Move
            </button>
            <button
              type="button"
              onClick={() => handleAction(onRename)}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
            >
              <Pencil className="w-4 h-4 text-gray-500" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => handleAction(onDelete)}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-red-600 hover:bg-red-50 text-left touch-manipulation"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => handleAction(onInformation)}
              className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] sm:py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
            >
              <Info className="w-4 h-4 text-gray-500" />
              Information
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(menu, document.body);
}
