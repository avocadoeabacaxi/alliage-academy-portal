import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { CalendarDays, ArrowLeft, Clock } from 'lucide-react';

export default function EventRequestPlaceholder() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      <div className="card-modern p-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#00A6D6]/10 flex items-center justify-center mx-auto mb-5">
          <CalendarDays className="w-10 h-10 text-[#00A6D6]" />
        </div>
        <h1 className="text-xl font-bold text-[#003B5C] mb-2">{t('selection.eventTitle')}</h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 mb-4">
          <Clock className="w-3.5 h-3.5" />
          {t('selection.eventSoon')}
        </div>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{t('selection.eventSoonDesc')}</p>
      </div>
    </div>
  );
}