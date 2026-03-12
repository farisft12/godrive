import { createContext, useContext, useCallback, useRef, useState } from 'react';
import axiosInstance from '../services/axios';
import { filesApi } from '../services/axios';

const UploadContext = createContext(null);

const CHUNK_THRESHOLD_BYTES = 80 * 1024 * 1024; // 80 MB: use chunked upload above this
const UPLOAD_RESUME_PREFIX = 'godrive_upload_resume_v1:';

function fingerprintFile(file, folderId) {
  return `${file?.name || ''}:${file?.size || 0}:${file?.lastModified || 0}:${folderId || ''}`;
}

function makeUploadId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function UploadProvider({ children }) {
  const [uploads, setUploads] = useState([]);
  const onUploadedRef = useRef(null);
  const abortRef = useRef({});

  const removeUpload = useCallback((id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    delete abortRef.current[id];
  }, []);

  const startUpload = useCallback(
    async (item) => {
      const controller = new AbortController();
      abortRef.current[item.id] = controller;
      const setProgress = (p) =>
        setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress: p } : u)));

      try {
        if (item.file.size < CHUNK_THRESHOLD_BYTES) {
          const formData = new FormData();
          formData.append('file', item.file);
          if (item.folderId) formData.append('folder_id', item.folderId);
          await axiosInstance.post('/api/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const p = e.loaded && e.total ? Math.round((e.loaded / e.total) * 100) : 0;
              setProgress(p);
            },
            signal: controller.signal,
          });
        } else {
          const fp = fingerprintFile(item.file, item.folderId || null);
          const key = UPLOAD_RESUME_PREFIX + fp;
          let uploadId = item.uploadId || null;
          let startIndex = 0;
          let chunkSize = null;
          if (uploadId) {
            try {
              const status = await filesApi.getChunkStatus(uploadId, controller.signal);
              startIndex = Number(status.next_index) || 0;
              chunkSize = Number(status.chunk_size) || null;
            } catch (_) {
              uploadId = null;
            }
          } else {
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                uploadId = parsed.uploadId || null;
              } catch (_) {}
            }
            if (uploadId) {
              try {
                const status = await filesApi.getChunkStatus(uploadId, controller.signal);
                startIndex = Number(status.next_index) || 0;
                chunkSize = Number(status.chunk_size) || null;
              } catch (_) {
                uploadId = null;
              }
            }
          }

          // Ensure state contains uploadId (for Resume button).
          if (uploadId) {
            setUploads((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, uploadId } : u))
            );
          }

          const result = await filesApi.uploadChunked(item.file, item.folderId || null, setProgress, controller.signal, uploadId ? { uploadId, startIndex, chunkSize } : {});
          if (result?.upload_id) {
            localStorage.setItem(key, JSON.stringify({ uploadId: result.upload_id }));
          }
        }
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'done', progress: 100 } : u))
        );
        onUploadedRef.current?.();
        // Cleanup resume info on success
        try {
          const fp = fingerprintFile(item.file, item.folderId || null);
          localStorage.removeItem(UPLOAD_RESUME_PREFIX + fp);
        } catch (_) {}
        setTimeout(() => removeUpload(item.id), 2000);
      } catch (err) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          setUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, status: 'paused' } : u))
          );
        } else {
          const msg = err.response?.data?.error || err.message;
          const limitMb = err.response?.data?.limit_mb;
          const hint413 = limitMb != null ? ` Batas chunk: ${limitMb} MB. Set CHUNK_SIZE_MB=10 di Backend/.env lalu restart backend.` : '';
          if (err.code === 'ERR_NETWORK' || (err.message && (err.message.includes('CONNECTION_RESET') || err.message.includes('CONNECTION_REFUSED') || err.message.includes('Network Error')))) {
            const hint = 'Pastikan backend jalan (npm run dev di folder Backend) dan port sama dengan Frontend (.env: VITE_API_URL atau VITE_BACKEND_PORT).';
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: 'error', error: `${msg}. ${hint}` } : u
              )
            );
          } else {
            if (err.response?.status === 500) console.error('[Upload] 500 from backend:', msg, err.response?.data);
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: 'error', error: msg + hint413 } : u
              )
            );
          }
        }
      } finally {
        delete abortRef.current[item.id];
      }
    },
    [removeUpload]
  );

  const addFiles = useCallback(
    (files, folderId = null) => {
      if (!files?.length) return;
      const newItems = Array.from(files).map((file) => ({
        id: makeUploadId(),
        file,
        folderId,
        progress: 0,
        status: 'uploading',
        error: null,
        uploadId: null,
      }));
      setUploads((prev) => [...prev, ...newItems]);
      newItems.forEach((item) => startUpload(item));
    },
    [startUpload]
  );

  const pause = useCallback((id) => {
    const controller = abortRef.current[id];
    if (controller) controller.abort();
    setUploads((prev) =>
      prev.map((u) => (u.id === id && u.status === 'uploading' ? { ...u, status: 'paused' } : u))
    );
  }, []);

  const resume = useCallback(
    (id) => {
      setUploads((prev) => {
        const item = prev.find((u) => u.id === id);
        if (!item || (item.status !== 'paused' && item.status !== 'error')) return prev;
        const next = prev.map((u) =>
          u.id === id ? { ...u, status: 'uploading', progress: 0, error: null } : u
        );
        queueMicrotask(() => startUpload({ ...item, progress: 0, status: 'uploading' }));
        return next;
      });
    },
    [startUpload]
  );

  const cancel = useCallback((id) => {
    const controller = abortRef.current[id];
    if (controller) controller.abort();
    setUploads((prev) => prev.filter((u) => u.id !== id));
    delete abortRef.current[id];
  }, []);

  const setOnUploaded = useCallback((cb) => {
    onUploadedRef.current = cb;
  }, []);

  return (
    <UploadContext.Provider
      value={{
        uploads,
        addFiles,
        pause,
        resume,
        cancel,
        setOnUploaded,
        removeUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}
