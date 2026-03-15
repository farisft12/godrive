import { createContext, useContext, useState, useCallback } from 'react';

const DownloadContext = createContext(null);

export function DownloadProvider({ children }) {
  const [downloads, setDownloads] = useState([]);

  const addDownload = useCallback((id, name) => {
    setDownloads((prev) => [...prev, { id, name, progress: 0, status: 'downloading', loaded: 0, total: 0 }]);
  }, []);

  const updateProgress = useCallback((id, progress, speed, loaded, total) => {
    setDownloads((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...(progress != null && { progress }),
              ...(speed != null && { speed }),
              ...(loaded != null && { loaded }),
              ...(total != null && { total }),
            }
          : d
      )
    );
  }, []);

  const setDone = useCallback((id) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, progress: 100, status: 'done' } : d))
    );
  }, []);

  const setError = useCallback((id, error) => {
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'error', error } : d))
    );
  }, []);

  const removeDownload = useCallback((id) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const value = {
    downloads,
    addDownload,
    updateProgress,
    setDone,
    setError,
    removeDownload,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
}
