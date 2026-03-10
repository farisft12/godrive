import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { getFileIconComponent, formatSize, formatDate, isImage, isVideo, isPdf } from '../utils/fileIcons';
import { filesApi } from '../services/axios';
import { useToast } from '../context/ToastContext';
import FileActionMenu from './FileActionMenu';
import { useLongPress } from '../hooks/useLongPress';
import clsx from 'clsx';

export default function FileCard({
  file,
  view = 'grid',
  onPreview,
  onShare,
  onDelete,
  onRename,
  onMove,
  onInformation,
  onRestore,
  onDeletePermanent,
  selected,
  onSelect,
  onOpenContextMenu,
  trashView = false,
  isShared = false,
  onDragStartMove,
}) {
  const Icon = getFileIconComponent(file.mime_type, file.original_name);
  const [loading, setLoading] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(null);
  const toast = useToast();

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const canHaveThumb = isImage(file?.mime_type) || isVideo(file?.mime_type) || isPdf(file?.mime_type);
  useEffect(() => {
    if (!file?.id || !canHaveThumb) return;
    const controller = new AbortController();
    const { signal } = controller;
    let objectUrl = null;
    const urlsToRevoke = [];
    const token = localStorage.getItem('godrive_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const safeSetThumb = (url) => {
      if (signal.aborted) return;
      if (typeof url === 'string' && url.startsWith('blob:')) urlsToRevoke.push(url);
      setThumbUrl(url);
    };

    fetch(`${API_BASE}/api/files/${file.id}/thumbnail`, { headers, signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        if (signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        safeSetThumb(objectUrl);
      })
      .catch((err) => {
        if (signal.aborted || err?.name === 'AbortError') return;
        if (!isVideo(file.mime_type)) return;
        fetch(`${API_BASE}/api/files/${file.id}/download`, { headers, signal })
          .then((res) => (res.ok ? res.blob() : Promise.reject()))
          .then((blob) => {
            if (signal.aborted) return;
            const vUrl = URL.createObjectURL(blob);
            urlsToRevoke.push(vUrl);
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.setAttribute('playsinline', '');
            const timeout = setTimeout(() => {
              video.src = '';
              URL.revokeObjectURL(vUrl);
            }, 10000);
            const onSeeked = () => {
              clearTimeout(timeout);
              try {
                if (signal.aborted) return;
                const w = video.videoWidth;
                const h = video.videoHeight;
                if (w > 0 && h > 0) {
                  const canvas = document.createElement('canvas');
                  canvas.width = w;
                  canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(video, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    safeSetThumb(dataUrl);
                  }
                }
              } finally {
                cleanup();
              }
            };
            const onError = () => cleanup();
            const cleanup = () => {
              clearTimeout(timeout);
              video.removeEventListener('loadeddata', onLoaded);
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              video.src = '';
              URL.revokeObjectURL(vUrl);
            };
            const onLoaded = () => {
              const duration = video.duration;
              if (Number.isFinite(duration) && duration > 0) {
                video.currentTime = Math.min(1, duration * 0.1);
              } else {
                video.currentTime = 0.5;
              }
            };
            video.addEventListener('loadeddata', onLoaded);
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
            video.src = vUrl;
          })
          .catch(() => {});
      });

    return () => {
      controller.abort();
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setThumbUrl(null);
    };
  }, [file?.id, file?.mime_type, canHaveThumb]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await filesApi.download(file.id, file.original_name);
      toast.success('Download started');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTrash = async () => {
    try {
      await filesApi.trash(file.id);
      toast.success('Moved to trash');
      onDelete?.();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.(file, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey });
  };

  const handleOpenContextMenuAt = useCallback(
    (x, y) => {
      onOpenContextMenu?.({ clientX: x, clientY: y, preventDefault: () => {} }, file, 'file');
    },
    [file, onOpenContextMenu]
  );
  const longPress = useLongPress(handleOpenContextMenuAt, 500);

  const isGrid = view === 'grid';

  if (isGrid) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        onContextMenu={(e) => onOpenContextMenu?.(e, file, 'file')}
        {...longPress}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onPreview?.(file);
        }}
        draggable={!trashView && !!onDragStartMove}
        onDragStart={(e) => onDragStartMove?.(e, file.id, 'file')}
        className={clsx(
          'group rounded-xl border bg-white cursor-pointer overflow-hidden transition-shadow',
          selected
            ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
            : 'border-gray-100 hover:shadow-lg hover:border-gray-200'
        )}
        data-selectable-id={file.id}
      >
        <div className="aspect-square flex flex-col items-center justify-center p-4 relative">
          <div
            role="button"
            tabIndex={0}
            className={clsx(
              'absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white hover:border-primary-400'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(file, { ctrlKey: true });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(file, { ctrlKey: true });
              }
            }}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          {isShared && (
            <div className="absolute top-2 left-8 p-1 rounded-md bg-primary-100 text-primary-600" title="Shared">
              <Share2 className="w-4 h-4" />
            </div>
          )}
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3 overflow-hidden">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon className="w-8 h-8 text-gray-600" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate w-full text-center px-1">
            {file.original_name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatSize(file.size_bytes)} · {formatDate(file.updated_at)}
          </p>
          <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity touch-manipulation">
            <FileActionMenu
              type="file"
              onDownload={handleDownload}
              onShare={() => onShare?.(file)}
              onMove={() => onMove?.(file)}
              onRename={() => onRename?.(file)}
              onDelete={handleTrash}
              onInformation={() => onInformation?.(file)}
              trashView={trashView}
              onRestore={() => onRestore?.(file.id)}
              onDeletePermanent={() => onDeletePermanent?.(file.id)}
              align="right"
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={handleClick}
      onContextMenu={(e) => onOpenContextMenu?.(e, file, 'file')}
      {...longPress}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onPreview?.(file);
      }}
      draggable={!trashView && !!onDragStartMove}
      onDragStart={(e) => onDragStartMove?.(e, file.id, 'file')}
      className={clsx(
        'group flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
        selected ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-gray-50'
      )}
      data-selectable-id={file.id}
    >
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
          selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white hover:border-primary-400'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(file, { ctrlKey: true });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(file, { ctrlKey: true });
          }
        }}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 relative overflow-hidden">
        {isShared && (
          <span className="absolute -top-0.5 -right-0.5 z-10 text-primary-600" title="Shared">
            <Share2 className="w-3.5 h-3.5" />
          </span>
        )}
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-5 h-5 text-gray-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">{file.original_name}</p>
        <p className="text-xs text-gray-500">
          {formatSize(file.size_bytes)} · {formatDate(file.updated_at)}
        </p>
      </div>
      <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 touch-manipulation">
        <FileActionMenu
          type="file"
          onDownload={handleDownload}
          onShare={() => onShare?.(file)}
          onMove={() => onMove?.(file)}
          onRename={() => onRename?.(file)}
          onDelete={handleTrash}
          onInformation={() => onInformation?.(file)}
          trashView={trashView}
          onRestore={() => onRestore?.(file.id)}
          onDeletePermanent={() => onDeletePermanent?.(file.id)}
          align="left"
        />
      </div>
    </motion.div>
  );
}
