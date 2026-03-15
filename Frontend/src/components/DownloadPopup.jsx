import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { useDownload } from '../context/DownloadContext';
import { formatSpeed, formatSize } from '../utils/fileIcons';
import { useEffect } from 'react';

export default function DownloadPopup() {
  const { downloads, removeDownload } = useDownload();

  useEffect(() => {
    const done = downloads.filter((d) => d.status === 'done' || d.status === 'error');
    if (done.length === 0) return;
    const t = setTimeout(() => {
      done.forEach((d) => removeDownload(d.id));
    }, 2500);
    return () => clearTimeout(t);
  }, [downloads, removeDownload]);

  if (downloads.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download
        </span>
      </div>
      <ul className="max-h-48 overflow-y-auto p-2">
        <AnimatePresence>
          {downloads.map((u) => (
            <motion.li
              key={u.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-900 truncate">
                {u.name}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  {u.progress != null ? (
                    <motion.div
                      className={`h-full rounded-full ${
                        u.status === 'error' ? 'bg-red-500' : 'bg-primary-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${u.progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  ) : (
                    <div
                      className={`h-full rounded-full ${
                        u.status === 'error' ? 'bg-red-500' : 'bg-primary-500 animate-pulse'
                      }`}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500 shrink-0 min-w-[4rem] text-right">
                  {u.status === 'done'
                    ? 'Selesai'
                    : u.status === 'error'
                      ? 'Error'
                      : u.progress != null
                        ? `${u.progress}%`
                        : ''}
                </span>
              </div>
              {u.status === 'downloading' && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                  {u.total > 0 ? (
                    <span>
                      {formatSize(u.loaded || 0)} / {formatSize(u.total)}
                    </span>
                  ) : (u.loaded || 0) > 0 ? (
                    <span>{formatSize(u.loaded)} terunduh</span>
                  ) : null}
                  {u.speed != null && (
                    <span>Kecepatan: {formatSpeed(u.speed)}</span>
                  )}
                </div>
              )}
              {u.error && (
                <p className="text-xs text-red-600 truncate" title={u.error}>
                  {u.error}
                </p>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
