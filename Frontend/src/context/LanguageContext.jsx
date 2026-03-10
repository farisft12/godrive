import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getLang, t } from '../utils/translations';

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getLang);

  const setLang = useCallback((value) => {
    const v = value === 'id' || value === 'en' ? value : getLang();
    localStorage.setItem('godrive_language', v);
    setLangState(v);
  }, []);

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: getLang(), setLang: () => {}, t };
  return ctx;
}
