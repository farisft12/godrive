import { createContext, useContext, useCallback, useRef, useState } from 'react';
import axiosInstance from '../services/axios';

const UploadContext = createContext(null);

let nextId = 1;

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
      const formData = new FormData();
      formData.append('file', item.file);
      if (item.folderId) formData.append('folder_id', item.folderId);

      try {
        await axiosInstance.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const p = e.loaded && e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            setUploads((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, progress: p } : u))
            );
          },
          signal: controller.signal,
        });
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'done', progress: 100 } : u))
        );
        onUploadedRef.current?.();
        setTimeout(() => removeUpload(item.id), 2000);
      } catch (err) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          setUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, status: 'paused' } : u))
          );
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? { ...u, status: 'error', error: err.response?.data?.error || err.message }
                : u
            )
          );
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
        id: `upload-${nextId++}`,
        file,
        folderId,
        progress: 0,
        status: 'uploading',
        error: null,
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
