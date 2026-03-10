import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Pause, Play, X, Wifi, WifiOff, Signal, SignalZero } from 'lucide-react';
import { useUpload } from '../context/UploadContext';
import clsx from 'clsx';

function useNetworkStatus() {
  const [status, setStatus] = useState(() => {
    const c = navigator.connection || navigator.mozConnection;
    if (!c) return { effectiveType: null, downlink: null, rtt: null };
    return {
      effectiveType: c.effectiveType || null,
      downlink: c.downlink != null ? c.downlink : null,
      rtt: c.rtt != null ? c.rtt : null,
    };
  });

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection;
    if (!conn) return;
    const update = () => {
      setStatus({
        effectiveType: conn.effectiveType || null,
        downlink: conn.downlink != null ? conn.downlink : null,
        rtt: conn.rtt != null ? conn.rtt : null,
      });
    };
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  return status;
}

export default function UploadPopup() {
  const { uploads, pause, resume, cancel } = useUpload();
  const [collapsed, setCollapsed] = useState(false);
  const network = useNetworkStatus();
  const networkLabel =
    network.effectiveType != null || network.downlink != null || network.rtt != null
      ? [
          network.effectiveType ? String(network.effectiveType).toUpperCase() : null,
          network.downlink != null ? `${network.downlink} Mbps` : null,
          network.rtt != null ? `${network.rtt} ms` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '—';
  const isWeak =
    network.effectiveType === 'slow-2g' ||
    network.effectiveType === '2g' ||
    (network.downlink != null && network.downlink < 1) ||
    (network.rtt != null && network.rtt > 300);
  const NetworkIcon =
    typeof navigator !== 'undefined' && !navigator.onLine ? WifiOff : isWeak ? SignalZero : network.effectiveType ? Signal : Wifi;

  if (uploads.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">
          {uploads.filter((u) => u.status === 'uploading' || u.status === 'paused').length > 0
            ? 'Uploading...'
            : 'Uploads'}
        </span>
        {collapsed ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 bg-gray-50/50">
        <NetworkIcon
          className={clsx('w-4 h-4 shrink-0', isWeak || (typeof navigator !== 'undefined' && !navigator.onLine) ? 'text-amber-500' : 'text-green-600')}
          aria-hidden
        />
        <span className="text-xs text-gray-600 truncate">Jaringan: {networkLabel}</span>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="max-h-64 overflow-y-auto p-2">
              {uploads.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">
                      {u.file.name}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {u.status === 'uploading' && (
                        <button
                          type="button"
                          onClick={() => pause(u.id)}
                          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {(u.status === 'paused' || u.status === 'error') && (
                        <button
                          type="button"
                          onClick={() => resume(u.id)}
                          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                          title="Resume"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {u.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() => cancel(u.id)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={clsx(
                          'h-full rounded-full',
                          u.status === 'error' ? 'bg-red-500' : 'bg-primary-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${u.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 shrink-0">
                      {u.status === 'done' ? 'Done' : u.status === 'error' ? 'Error' : `${u.progress}%`}
                    </span>
                  </div>
                  {u.error && (
                    <p className="text-xs text-red-600 truncate" title={u.error}>
                      {u.error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
