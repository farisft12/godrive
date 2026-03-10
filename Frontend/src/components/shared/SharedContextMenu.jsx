import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Download, FolderInput } from 'lucide-react';

export default function SharedContextMenu({
  open,
  position = { x: 0, y: 0 },
  file,
  onClose,
  onOpen,
  onDownload,
  onSaveToDrive,
  isLoggedIn,
}) {
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

  if (!open || !file) return null;

  const padding = 8;
  const menuWidth = 192;
  const menuHeight = 160;
  const maxX = typeof window !== 'undefined' ? window.innerWidth - menuWidth - padding : position.x;
  const maxY = typeof window !== 'undefined' ? window.innerHeight - menuHeight - padding : position.y;
  const x = Math.max(padding, Math.min(position.x, maxX));
  const y = Math.max(padding, Math.min(position.y, maxY));

  const menu = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
        className="w-48 py-1 bg-white rounded-xl shadow-lg border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => handleAction(onOpen)}
          className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
        >
          <Eye className="w-4 h-4 text-gray-500" />
          Open
        </button>
        <button
          type="button"
          onClick={() => handleAction(onDownload)}
          className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
        >
          <Download className="w-4 h-4 text-gray-500" />
          Download
        </button>
        {isLoggedIn && onSaveToDrive && (
          <button
            type="button"
            onClick={() => handleAction(() => onSaveToDrive(file))}
            className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 text-left touch-manipulation"
          >
            <FolderInput className="w-4 h-4 text-gray-500" />
            Simpan ke driveku
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(menu, document.body);
}
