import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { GraduationCap, CalendarDays, ChevronRight, ArrowLeft } from 'lucide-react';

export default function RequestTypeSelection() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSolicitante = user?.role === 'solicitante';
  const trainingRoute = isSolicitante ? '/solicitacao/training' : '/requests/new/training';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>

      {/* Header */}
      <div className="bg-[#003B5C] rounded-2xl p-6 mb-6 text-center shadow-lg shadow-[#003B5C]/10">
        <h1 className="text-xl lg:text-2xl font-bold text-white">{t('selection.title')}</h1>
        <p className="text-sm text-cyan-200/70 mt-1.5 max-w-2xl mx-auto">{t('selection.subtitle')}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Training / Technical Support */}
        <button
          onClick={() => navigate(trainingRoute)}
          className="card-modern p-6 text-left hover:shadow-card-hover transition-all group cursor-pointer border-2 border-transparent hover:border-[#00A6D6]/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#00A6D6]/10 flex items-center justify-center mb-4 group-hover:bg-[#00A6D6]/15 transition-colors">
            <GraduationCap className="w-7 h-7 text-[#00A6D6]" />
          </div>
          <h2 className="text-lg font-bold text-[#003B5C] mb-1.5">{t('selection.trainingTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{t('selection.trainingDesc')}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#00A6D6]">
            {t('common.create')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* Event */}
        <button
          onClick={() => navigate('/requests/new/event')}
          className="card-modern p-6 text-left hover:shadow-card-hover transition-all group cursor-pointer border-2 border-transparent hover:border-[#00A6D6]/30 relative"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#00A6D6]/10 flex items-center justify-center mb-4 group-hover:bg-[#00A6D6]/15 transition-colors">
            <CalendarDays className="w-7 h-7 text-[#00A6D6]" />
          </div>
          <h2 className="text-lg font-bold text-[#003B5C] mb-1.5">{t('selection.eventTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{t('selection.eventDesc')}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#00A6D6]">
            {t('common.create')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}