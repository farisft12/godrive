import { motion } from 'framer-motion';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/fileIcons';

export default function SharedFolderCard({
  folder,
  view = 'grid',
  onOpen,
}) {
  const isGrid = view === 'grid';

  if (isGrid) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        role="button"
        tabIndex={0}
        onClick={() => onOpen?.(folder.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.(folder.id);
          }
        }}
        className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-gray-300 transition-shadow cursor-pointer touch-manipulation"
      >
        <div className="aspect-square flex flex-col items-center justify-center p-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <FolderOpen className="w-8 h-8 sm:w-9 sm:h-9 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-gray-900 truncate w-full text-center px-1">
            {folder.name}
          </p>
          {folder.updated_at && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(folder.updated_at)}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(folder.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(folder.id);
        }
      }}
      className="group flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50/80 hover:shadow-sm transition-colors cursor-pointer touch-manipulation"
    >
      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
        <FolderOpen className="w-5 h-5 text-amber-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">{folder.name}</p>
        {folder.updated_at && (
          <p className="text-xs text-gray-500">{formatDate(folder.updated_at)}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
    </motion.div>
  );
}
