import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { GraduationCap, CalendarDays, ChevronRight, History } from 'lucide-react';

export default function PastEventSelection() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003B5C] mb-1 flex items-center gap-2">
          <History className="w-6 h-6 text-[#00A6D6]" />
          {t('selection.pastTitle')}
        </h1>
        <p className="text-sm text-slate-500">{t('selection.pastSubtitle')}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Training / Technical Support */}
        <button
          onClick={() => navigate('/requests/past/training')}
          className="card-modern p-6 text-left hover:shadow-card-hover transition-all group cursor-pointer border-2 border-transparent hover:border-[#00A6D6]/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#00A6D6]/10 flex items-center justify-center mb-4 group-hover:bg-[#00A6D6]/15 transition-colors">
            <GraduationCap className="w-7 h-7 text-[#00A6D6]" />
          </div>
          <h2 className="text-lg font-bold text-[#003B5C] mb-1.5">{t('selection.pastTrainingTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{t('selection.pastTrainingDesc')}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#00A6D6]">
            {t('common.create')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* Event */}
        <button
          onClick={() => navigate('/requests/past/event')}
          className="card-modern p-6 text-left hover:shadow-card-hover transition-all group cursor-pointer border-2 border-transparent hover:border-[#00A6D6]/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#00A6D6]/10 flex items-center justify-center mb-4 group-hover:bg-[#00A6D6]/15 transition-colors">
            <CalendarDays className="w-7 h-7 text-[#00A6D6]" />
          </div>
          <h2 className="text-lg font-bold text-[#003B5C] mb-1.5">{t('selection.pastEventTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{t('selection.pastEventDesc')}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#00A6D6]">
            {t('common.create')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}