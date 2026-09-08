import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { alliage } from '@/api/alliageClient';
import { translations } from './translations';
import { translateOption } from './optionValues';

const LanguageContext = createContext();

const LANGS = ['pt', 'en', 'es'];

function detectLanguage() {
  try {
    const urlLanguage = new URLSearchParams(window.location.search).get('lang');
    if (urlLanguage && LANGS.includes(urlLanguage)) {
      localStorage.setItem('alliage_lang', urlLanguage);
      return urlLanguage;
    }
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

  useEffect(() => {
    alliage.auth.isAuthenticated().then((authenticated) => {
      if (authenticated) return alliage.auth.updateMe({ preferred_language: lang });
    }).catch(() => {});
  }, [lang]);

  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.pt[key] || key;
  }, [lang]);

  const tf = useCallback((field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.pt || field.en || field.es || '';
  }, [lang]);

  const tv = useCallback((value) => translateOption(value, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tf, tv }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}