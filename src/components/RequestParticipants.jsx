import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Users, Plus, Loader2, Check, Mail, Phone, X } from 'lucide-react';

export default function RequestParticipants({ request, onUpdated }) {
  const { t } = useLanguage();
  const participants = request.participants_list || [];
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const next = [...participants, { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() }];
      await base44.entities.TrainingRequest.update(request.id, { participants_list: next });
      setForm({ name: '', phone: '', email: '' });
      setAdding(false);
      onUpdated && onUpdated();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-modern p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#00A6D6]/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-[#00A6D6]" />
        </div>
        <h2 className="text-sm font-semibold text-[#003B5C]">{t('form.participantsListLabel')}</h2>
        <span className="text-xs text-slate-400">({participants.length})</span>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-slate-400 mb-3">{t('detail.noParticipants')}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {participants.map((p, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 bg-slate-50 rounded-xl p-3">
              <span className="text-sm font-medium text-slate-800 flex-1">{p.name || '—'}</span>
              {p.phone && (
                <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>
              )}
              {p.email && (
                <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-base" placeholder={t('form.participantName')} />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-base" placeholder={t('form.participantPhone')} />
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-base" placeholder={t('form.participantEmail')} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-full hover:bg-emerald-600 disabled:opacity-40 transition-colors shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t('common.save')}
            </button>
            <button onClick={() => { setAdding(false); setForm({ name: '', phone: '', email: '' }); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              <X className="w-4 h-4" />
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#00A6D6] border border-dashed border-[#00A6D6]/40 rounded-lg hover:bg-[#00A6D6]/5 transition-colors w-full justify-center">
          <Plus className="w-4 h-4" />
          {t('form.addParticipant')}
        </button>
      )}
    </div>
  );
}