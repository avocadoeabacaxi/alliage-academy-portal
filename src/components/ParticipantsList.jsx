import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Plus, Trash2, Users } from 'lucide-react';

export default function ParticipantsList({ participants = [], onChange }) {
  const { t } = useLanguage();

  const update = (index, key, value) => {
    const next = participants.map((p, i) => (i === index ? { ...p, [key]: value } : p));
    onChange(next);
  };

  const add = () => onChange([...participants, { name: '', phone: '', email: '', attendance_mode: 'Presencial' }]);
  const remove = (index) => onChange(participants.filter((_, i) => i !== index));

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
        <Users className="w-4 h-4 text-[#00A6D6]" />
        {t('form.participantsListLabel')}
      </label>
      <p className="text-xs text-slate-400 mb-3">{t('form.participantsListHint')}</p>

      <div className="space-y-3">
        {participants.map((p, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">
                {t('form.participant')} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={p.name || ''}
                onChange={(e) => update(i, 'name', e.target.value)}
                className="input-base"
                placeholder={t('form.participantName')}
              />
              <input
                value={p.phone || ''}
                onChange={(e) => update(i, 'phone', e.target.value)}
                className="input-base"
                placeholder={t('form.participantPhone')}
              />
              <input
                type="email"
                value={p.email || ''}
                onChange={(e) => update(i, 'email', e.target.value)}
                className="input-base"
                placeholder={t('form.participantEmail')}
              />
              <select value={p.attendance_mode || 'Presencial'} onChange={(e) => update(i, 'attendance_mode', e.target.value)} className="input-base">
                <option value="Online">{t('format.online')}</option>
                <option value="Presencial">{t('format.presencial')}</option>
                <option value="Híbrido">{t('format.hibrido')}</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#00A6D6] border border-dashed border-[#00A6D6]/40 rounded-lg hover:bg-[#00A6D6]/5 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        {t('form.addParticipant')}
      </button>
    </div>
  );
}