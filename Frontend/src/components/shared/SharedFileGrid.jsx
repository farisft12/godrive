import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List } from 'lucide-react';
import SharedFileCard from './SharedFileCard';
import clsx from 'clsx';

export default function SharedFileGrid({
  files = [],
  view: controlledView,
  onViewChange,
  onPreview,
  onDownload,
  onOpenContextMenu,
  token = '',
  passwordQ = '',
  emptyMessage = 'This folder is empty.',
}) {
  const [internalView, setInternalView] = useState('grid');
  const view = controlledView ?? internalView;
  const setView = onViewChange ?? setInternalView;

  if (files.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-center font-medium">{emptyMessage}</p>
        <p className="text-sm text-gray-400 mt-1">Files shared with you will appear here.</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </p>
        {onViewChange ? null : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={clsx(
              'p-2 rounded-lg transition-colors touch-manipulation',
              view === 'grid'
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-500 hover:bg-gray-100'
            )}
            title="Grid view"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={clsx(
              'p-2 rounded-lg transition-colors touch-manipulation',
              view === 'list'
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-500 hover:bg-gray-100'
            )}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
          >
            {files.map((file, i) => (
              <motion.div
                key={file.file_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <SharedFileCard
                  file={file}
                  view="grid"
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onOpenContextMenu={onOpenContextMenu}
                  token={token}
                  passwordQ={passwordQ}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1"
          >
            {files.map((file, i) => (
              <motion.div
                key={file.file_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <SharedFileCard
                  file={file}
                  view="list"
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onOpenContextMenu={onOpenContextMenu}
                  token={token}
                  passwordQ={passwordQ}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
