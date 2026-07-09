import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function RequestSuccessScreen({ requestId }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <div className="card-modern p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>

        <h1 className="text-xl font-bold text-[#003B5C] mb-4">{t('form.successTitle')}</h1>

        {requestId && (
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('form.successOrderLabel')}</p>
            <p className="text-2xl font-bold text-[#00A6D6] mt-1">{requestId}</p>
          </div>
        )}

        <p className="text-sm text-slate-600 leading-relaxed mb-6">{t('form.successMessage')}</p>

        <button
          onClick={() => navigate('/my-requests')}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#00A6D6] rounded-lg hover:bg-[#0094BD] transition-colors"
        >
          {t('form.successButton')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}