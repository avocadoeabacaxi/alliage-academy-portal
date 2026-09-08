import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alliage } from '@/api/alliageClient';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { GraduationCap, CalendarDays, ChevronRight, Wrench } from 'lucide-react';
import { requestTypeLabels } from '@/lib/requestTypeLabels';

export default function RequestTypeSelection() {
  const { t, lang } = useLanguage();
  const labels = requestTypeLabels(lang);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    alliage.auth.me()
      .then(u => { setUser(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSolicitante = user?.role === 'solicitante';
  const trainingRoute = isSolicitante ? '/solicitacao/training' : '/requests/new/training';
  const supportRoute = isSolicitante ? '/solicitacao/support' : '/requests/new/support';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003B5C] mb-1">{t('selection.title')}</h1>
        <p className="text-sm text-slate-500">{t('selection.subtitle')}</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Training / Technical Support */}
        <button
          onClick={() => navigate(trainingRoute)}
          className="card-modern p-6 text-left hover:shadow-card-hover transition-all group cursor-pointer border-2 border-transparent hover:border-[#00A6D6]/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#00A6D6]/10 flex items-center justify-center mb-4 group-hover:bg-[#00A6D6]/15 transition-colors">
            <GraduationCap className="w-7 h-7 text-[#00A6D6]" />
          </div>
          <h2 className="text-lg font-bold text-[#003B5C] mb-1.5">{labels.training}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{labels.trainingDesc}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#00A6D6]">
            {t('common.create')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button onClick={() => navigate(supportRoute)} className="card-modern p-6 text-left hover:shadow-card-hover transition-all group cursor-pointer border-2 border-transparent hover:border-[#00A6D6]/30">
          <div className="w-14 h-14 rounded-2xl bg-[#00A6D6]/10 flex items-center justify-center mb-4"><Wrench className="w-7 h-7 text-[#00A6D6]" /></div>
          <h2 className="text-lg font-bold text-[#003B5C] mb-1.5">{labels.support}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{labels.supportDesc}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#00A6D6]">{t('common.create')}<ChevronRight className="w-4 h-4" /></div>
        </button>

        {/* Event */}
        <button
          onClick={() => navigate(isSolicitante ? '/solicitacao/event' : '/requests/new/event')}
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