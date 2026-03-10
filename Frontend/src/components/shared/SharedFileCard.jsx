import { motion } from 'framer-motion';
import { Download, Eye } from 'lucide-react';
import { getFileIconComponent, formatSize, formatDate, isImage, isVideo, isPdf } from '../../utils/fileIcons';
import { useCallback, useState } from 'react';
import { useLongPress } from '../../hooks/useLongPress';

export default function SharedFileCard({
  file,
  view = 'grid',
  onPreview,
  onDownload,
  onOpenContextMenu,
  token = '',
  passwordQ = '',
}) {
  const Icon = getFileIconComponent(file.mime_type, file.original_name);
  const isGrid = view === 'grid';
  const [thumbError, setThumbError] = useState(false);
  const canHaveThumb = (isImage(file.mime_type) || isVideo(file.mime_type) || isPdf(file.mime_type)) && token && file.file_id && !thumbError;
  const thumbUrl =
    canHaveThumb
      ? `${import.meta.env.VITE_API_URL || ''}/api/share/${token}/thumbnail?file_id=${file.file_id}${passwordQ}`
      : null;

  const handleOpenContextMenuAt = useCallback(
    (x, y) => {
      onOpenContextMenu?.({ preventDefault: () => {}, clientX: x, clientY: y }, file);
    },
    [file, onOpenContextMenu]
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
        className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-gray-300 transition-shadow"
      >
        <div
          className="aspect-square flex flex-col items-center justify-center p-4 relative cursor-pointer"
          onDoubleClick={() => onPreview?.(file)}
          onContextMenu={(e) => {
            e.preventDefault();
            onOpenContextMenu?.(e, file);
          }}
          {...longPress}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-3 overflow-hidden">
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setThumbError(true)}
              />
            ) : (
              <Icon className="w-8 h-8 sm:w-9 sm:h-9 text-gray-600" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate w-full text-center px-1">
            {file.original_name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatSize(file.size_bytes)}
          </p>
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPreview?.(file); }}
              className="p-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm touch-manipulation"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownload?.(file); }}
              className="p-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm touch-manipulation"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        {file.updated_at && (
          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            {formatDate(file.updated_at)}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50/80 hover:shadow-sm transition-colors"
    >
      <div
        className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
        onDoubleClick={() => onPreview?.(file)}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenContextMenu?.(e, file);
        }}
        {...longPress}
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setThumbError(true)}
            />
          ) : (
            <Icon className="w-5 h-5 text-gray-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{file.original_name}</p>
          <p className="text-xs text-gray-500">
            {formatSize(file.size_bytes)}
            {file.updated_at && ` · ${formatDate(file.updated_at)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onPreview?.(file)}
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 touch-manipulation"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDownload?.(file)}
          className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 touch-manipulation"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
