import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'godrive_admin_dark';

function readStored() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function applyToDom(dark) {
  const root = document.documentElement;
  if (dark) {
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (_) {}
  } else {
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    try { localStorage.setItem(STORAGE_KEY, 'false'); } catch (_) {}
    // Force light: remove dark again next frame in case anything re-added it
    requestAnimationFrame(() => {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    });
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(readStored);

  // Sinkronkan DOM dengan state
  useEffect(() => {
    applyToDom(isDark);
  }, [isDark]);

  const setDark = useCallback((value) => {
    const next = Boolean(value);
    applyToDom(next);
    setIsDark(next);
  }, []);

  // Toggle: ubah DOM + localStorage dulu, baru state (agar tampilan langsung berubah)
  const toggleDark = useCallback(() => {
    const next = !readStored();
    applyToDom(next);
    setIsDark(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, dark: isDark, setDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: false,
      dark: false,
      setDark: () => {},
      toggleDark: () => {},
    };
  }
  return ctx;
}
