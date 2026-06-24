import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const LANG_LABELS = { pt: 'PT', en: 'EN', es: 'ES' };
const LANG_FLAGS = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };

export default function LanguageSelector({ compact = false }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
      >
        <span>{LANG_FLAGS[lang]}</span>
        {!compact && <span>{LANG_LABELS[lang]}</span>}
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
            {['pt', 'en', 'es'].map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${lang === l ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'}`}
              >
                <span className="text-base">{LANG_FLAGS[l]}</span>
                <span>{LANG_LABELS[l]}</span>
                {lang === l && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}