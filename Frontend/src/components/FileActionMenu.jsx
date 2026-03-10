import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  FolderInput,
  Pencil,
  Trash2,
  Info,
  MoreVertical,
} from 'lucide-react';
import clsx from 'clsx';

export default function FileActionMenu({
  type = 'file',
  onDownload,
  onShare,
  onMove,
  onRename,
  onDelete,
  onInformation,
  trashView = false,
  onRestore,
  onDeletePermanent,
  className,
  align = 'right',
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const updatePosition = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: align === 'right' ? rect.right - 192 : rect.left,
      });
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) updatePosition();
    setOpen((o) => !o);
  };

  const handleAction = (fn) => {
    fn?.();
    setOpen(false);
  };

  const menuContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="action-menu"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[9999] w-48 py-1 bg-white rounded-lg shadow-lg border border-gray-200"
          style={{ top: position.top, left: position.left }}
        >
          {trashView ? (
            <>
              <button
                type="button"
                onClick={() => handleAction(onDownload)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <Download className="w-4 h-4 text-gray-500" />
                Download
              </button>
              <button
                type="button"
                onClick={() => handleAction(onRestore)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <FolderInput className="w-4 h-4 text-gray-500" />
                Restore
              </button>
              <button
                type="button"
                onClick={() => handleAction(onDeletePermanent)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
              >
                <Trash2 className="w-4 h-4" />
                Delete permanently
              </button>
            </>
          ) : (
            <>
              {onDownload && (
                <button
                  type="button"
                  onClick={() => handleAction(onDownload)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <Download className="w-4 h-4 text-gray-500" />
                  Download
                </button>
              )}
              {onShare && (
                <button
                  type="button"
                  onClick={() => handleAction(onShare)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <Share2 className="w-4 h-4 text-gray-500" />
                  Share
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAction(onMove)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <FolderInput className="w-4 h-4 text-gray-500" />
                Move
              </button>
              <button
                type="button"
                onClick={() => handleAction(onRename)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => handleAction(onDelete)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => handleAction(onInformation)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
              >
                <Info className="w-4 h-4 text-gray-500" />
                Information
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Actions"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      {createPortal(menuContent, document.body)}
    </div>
  );
}
