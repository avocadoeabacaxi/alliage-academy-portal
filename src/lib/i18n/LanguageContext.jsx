import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

const LANGS = ['pt', 'en', 'es'];

function detectLanguage() {
  try {
    const saved = localStorage.getItem('alliage_lang');
    if (saved && LANGS.includes(saved)) return saved;
  } catch (e) {}
  const browserLang = (navigator.language || 'pt').toLowerCase();
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('en')) return 'en';
  return 'pt';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try { localStorage.setItem('alliage_lang', newLang); } catch (e) {}
  }, []);

  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.pt[key] || key;
  }, [lang]);

  const tf = useCallback((field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.pt || field.en || field.es || '';
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tf }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}