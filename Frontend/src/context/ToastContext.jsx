import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg) => add(msg, 'success'), [add]);
  const error = useCallback((msg) => add(msg, 'error'), [add]);
  const info = useCallback((msg) => add(msg, 'info'), [add]);

  return (
    <ToastContext.Provider value={{ toasts, add, success, error, info }}>
      {children}
      <ToastList toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastList({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
            ${t.type === 'error' ? 'bg-red-500' : t.type === 'info' ? 'bg-blue-500' : 'bg-emerald-500'}
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
