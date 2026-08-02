import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function ParticipationAccessFields({ data, update, disabled = false }) {
  const { t } = useLanguage();
  const mode = data.guest_participation_mode || 'Presencial';
  const needsOnline = mode === 'Online';
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('form.guestParticipationMode')}</label>
        <div className="grid grid-cols-2 gap-2">
          {['Online', 'Presencial'].map(option => (
            <button type="button" key={option} disabled={disabled} onClick={() => update('guest_participation_mode', option)} className={`px-3 py-2 text-sm rounded-lg border transition-all disabled:cursor-default ${mode === option ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
              {t(`format.${option.toLowerCase().replace('í', 'i')}`)}
            </button>
          ))}
        </div>
      </div>
      {needsOnline && <div className="space-y-3 pl-3 border-l-2 border-[#00A6D6]/20">
        <label className="block text-sm font-medium text-slate-700">{t('form.onlinePlatform')}</label>
        <select disabled={disabled} value={data.online_platform || 'Google Meet'} onChange={e => update('online_platform', e.target.value)} className="input-base disabled:bg-slate-50">
          {['Google Meet', 'Microsoft Teams', 'Zoom', 'Outro'].map(option => <option key={option}>{option}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" disabled={disabled} checked={!!data.needs_educator_link} onChange={e => update('needs_educator_link', e.target.checked)} />{t('form.needsEducatorLink')}</label>
        {!data.needs_educator_link && <input type="url" disabled={disabled} value={data.online_access_link || ''} onChange={e => update('online_access_link', e.target.value)} className="input-base disabled:bg-slate-50" placeholder={t('form.onlineAccessLink')} />}
      </div>}
    </div>
  );
}