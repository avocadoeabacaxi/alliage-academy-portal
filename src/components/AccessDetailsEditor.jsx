import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ParticipationAccessFields from '@/components/ParticipationAccessFields';
import AddressFields from '@/components/AddressFields';
import { Loader2, Save } from 'lucide-react';

export default function AccessDetailsEditor({ request, canEdit, onUpdated }) {
  const { t } = useLanguage();
  const [data, setData] = useState(request);
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));
  const physical = ['Presencial', 'Híbrido'].includes(data.guest_participation_mode || 'Presencial');
  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.TrainingRequest.update(request.id, {
        guest_participation_mode: data.guest_participation_mode,
        online_platform: data.online_platform,
        online_access_link: data.online_access_link,
        needs_educator_link: data.needs_educator_link,
        location_country: data.location_country,
        location_city: data.location_city,
        location_specific: data.location_specific,
        location_postal_code: data.location_postal_code,
        location_street: data.location_street,
        location_number: data.location_number,
        location_complement: data.location_complement,
        location_formatted_address: data.location_formatted_address,
        location_place_id: data.location_place_id,
        training_scheduled_date: data.training_scheduled_date,
      });
      onUpdated();
    } catch (error) {
      alert(`${t('common.error')}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  return <div className="card-modern p-4 mb-3"><h2 className="text-sm font-semibold text-[#003B5C] mb-3">{t('detail.accessDetails')}</h2>{request.request_category !== 'Evento' && <div className="mb-4"><label className="block text-sm font-medium text-slate-700 mb-1.5">{t('detail.trainingScheduledDate')}</label><input type="date" disabled={!canEdit} value={data.training_scheduled_date || ''} onChange={e => update('training_scheduled_date', e.target.value)} className="input-base disabled:bg-slate-50" /></div>}<ParticipationAccessFields data={data} update={update} disabled={!canEdit} />{physical && <div className="mt-4"><AddressFields data={data} update={update} disabled={!canEdit} /></div>}{canEdit && <button onClick={save} disabled={saving} className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('common.save')}</button>}</div>;
}