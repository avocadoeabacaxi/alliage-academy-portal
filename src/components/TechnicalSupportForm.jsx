import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Loader2, Paperclip, X } from 'lucide-react';
import { alliage } from '@/api/alliageClient';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supportCopy } from '@/lib/i18n/supportAndFollowUp';
import { supportTypes } from '@/lib/requestTypeLabels';
import { emptySupportForm, validSupportStep, supportPayload } from '@/lib/technicalSupport';
import ProductSelector, { BRAND_OPTIONS, resolveProductName } from '@/components/ProductSelector';
import AddressFields from '@/components/AddressFields';
import RequestSuccessScreen from '@/components/RequestSuccessScreen';

export default function TechnicalSupportForm() {
  const { lang, t, tv } = useLanguage();
  const c = supportCopy(lang);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySupportForm);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState('');
  const busy = useRef(false);
  const requestId = useRef('');
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  useEffect(() => {
    let active = true;
    alliage.auth.me().then(user => {
      if (active) setForm(previous => ({ ...previous,
        requester_name: previous.requester_name || user.full_name || '',
        requester_email: previous.requester_email || user.email || '',
        requester_phone: previous.requester_phone || user.phone || '',
        company_name: previous.company_name || user.company_name || '',
      }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)
      || file.size > 10 * 1024 * 1024 || form.attachments.length >= 5) return setError(c.fileError);
    setUploading(true);
    setError('');
    try {
      const { file_url } = await alliage.integrations.Core.UploadFile({ file });
      setForm(previous => ({ ...previous, attachments: [...previous.attachments, { name: file.name, url: file_url }] }));
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (busy.current || uploading) return;
    const invalidStep = c.steps.findIndex((_, index) => !validSupportStep(form, index, BRAND_OPTIONS));
    if (invalidStep !== -1) { setStep(invalidStep); setError(c.invalid); return; }
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      if (!requestId.current) requestId.current = (await alliage.functions.invoke('generateRequestId')).data.request_id;
      let translations = {};
      try {
        const result = await alliage.functions.invoke('translateContent', {
          texts: { description: form.description, deadline_reason: form.deadline_reason }, source_lang: lang,
        });
        translations = result.data.translations || {};
      } catch { /* Keep the original description if translation is unavailable. */ }
      const payload = supportPayload(form, lang, requestId.current, form.products.map(resolveProductName), translations);
      await alliage.entities.TrainingRequest.create(payload);
      setSuccessId(requestId.current);
    } catch (err) { setError(err.message); } finally { busy.current = false; setSaving(false); }
  };
  const input = (key, label, required = false, type = 'text') => <Field label={label} required={required}>
    <input aria-label={label} type={type} value={form[key]} onChange={e => update(key, e.target.value)} className="input-base" />
  </Field>;
  if (successId) return <RequestSuccessScreen requestId={successId} />;
  return <div className="p-4 lg:p-6 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold text-[#003B5C]">{c.title}</h1>
    <p className="text-sm text-slate-500 mt-2">{c.intro}</p>
    <p className="text-sm text-slate-500 mt-3">{t('form.step')} {step + 1} {t('form.of')} {c.steps.length}</p>
    <div className="flex gap-2 my-4" aria-hidden="true">{c.steps.map((_, index) => <div key={index} className={`h-1.5 rounded flex-1 ${index <= step ? 'bg-[#00A6D6]' : 'bg-slate-200'}`} />)}</div>
    <h2 className="text-lg font-semibold text-slate-900 mb-4">{c.steps[step]}</h2>
    {error && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}
    <fieldset disabled={saving} className="card-modern p-5 space-y-4 min-h-[280px]">
      {step === 0 && <>
        {input('requester_name', t('form.requesterName'), true)}
        {input('requester_email', t('form.requesterEmail'), true, 'email')}
        {input('requester_phone', c.phone, true, 'tel')}
        {input('company_name', c.company, true)}
        <Field label={t('form.region')} required><select aria-label={t('form.region')} value={form.region} onChange={e => update('region', e.target.value)} className="input-base">
          {['Brasil', 'LATAM', 'USA', 'ROW'].map(value => <option key={value} value={value}>{t(`region.${value.toLowerCase()}`)}</option>)}
        </select></Field>
        {form.region !== 'USA' && input('region_detail', t(form.region === 'Brasil' ? 'form.regionDetailBrasil' : form.region === 'ROW' ? 'form.regionDetailRow' : 'form.regionDetailLatam'), true)}
      </>}
      {step === 1 && <>
        <ProductSelector products={form.products} onChange={products => update('products', products)} />
        {input('equipment_model', c.model)}{input('equipment_serial', c.serial)}
      </>}
      {step === 2 && <>
        <Field label={c.type} required><select aria-label={c.type} value={form.request_type} onChange={e => update('request_type', e.target.value)} className="input-base">
          {[...supportTypes, 'Outro'].map(value => <option key={value} value={value}>{tv(value)}</option>)}
        </select></Field>
        {form.request_type === 'Outro' && input('request_type_detail', c.supportSubtype, true)}
        <Field label={c.description} required><textarea aria-label={c.description} rows={6} maxLength={10000} value={form.description} onChange={e => update('description', e.target.value)} className="input-base" /><p className="text-xs text-slate-500 mt-1">{c.descriptionHint}</p></Field>
        <Field label={c.attachments}><p className="text-xs text-slate-500 mb-2">{c.attachmentsHint}</p>
          <input aria-label={c.attachments} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploading || form.attachments.length >= 5} onChange={upload} className="text-sm max-w-full" />
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          <ul className="mt-2 space-y-2">{form.attachments.map((file, index) => <li key={file.url} className="flex items-center gap-2 text-sm"><Paperclip className="w-4 h-4" /><span className="flex-1 break-all">{file.name}</span><button type="button" aria-label={`${t('common.delete')} ${file.name}`} onClick={() => update('attachments', form.attachments.filter((_, i) => i !== index))}><X className="w-4 h-4" /></button></li>)}</ul>
        </Field>
        {input('support_reference_url', c.video, false, 'url')}
      </>}
      {step === 3 && <>
        <Field label={c.urgency} required><select aria-label={c.urgency} value={form.priority} onChange={e => update('priority', e.target.value)} className="input-base">{['Baixa', 'Média', 'Alta'].map(value => <option key={value} value={value}>{tv(value)}</option>)}</select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.needs_deadline} onChange={e => update('needs_deadline', e.target.checked)} />{c.deadline}</label>
        {form.needs_deadline && input('deadline_requested', t('form.deadlineRequested'), true, 'date')}
        <Field label={c.reason}><textarea aria-label={c.reason} rows={3} value={form.deadline_reason} onChange={e => update('deadline_reason', e.target.value)} className="input-base" /></Field>
      </>}
      {step === 4 && <>
        <Field label={c.service} required><div className="grid grid-cols-2 gap-2">{[['Remoto', c.remote], ['Presencial', c.onsite]].map(([value, label]) => <button type="button" key={value} aria-pressed={form.format === value} onClick={() => update('format', value)} className={`px-3 py-3 rounded-lg border text-sm ${form.format === value ? 'border-[#00A6D6] bg-cyan-50 text-[#003B5C]' : 'border-slate-200'}`}>{label}</button>)}</div></Field>
        {form.format === 'Remoto' ? <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{c.remoteHint}</p> : <>
          <Field label={c.visit}><select aria-label={c.visit} value={form.support_visit_mode} onChange={e => update('support_visit_mode', e.target.value)} className="input-base"><option value="local">{c.local}</option><option value="ribeirao">{c.ribeirao}</option></select></Field>
          {form.support_visit_mode === 'local' && <AddressFields data={form} update={update} />}
        </>}
        <Field label={c.notes}><textarea aria-label={c.notes} rows={3} value={form.format_details} onChange={e => update('format_details', e.target.value)} className="input-base" /></Field>
      </>}
    </fieldset>
    <div className="flex items-center justify-between gap-3 mt-5">
      <button type="button" disabled={saving || uploading} onClick={() => { setError(''); step > 0 ? setStep(step - 1) : navigate(-1); }} className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600"><ChevronLeft className="w-4 h-4" />{t('common.back')}</button>
      <button type="button" disabled={saving || uploading || !validSupportStep(form, step, BRAND_OPTIONS)} onClick={() => { if (step === 4) submit(); else { setError(''); setStep(step + 1); } }} className="flex items-center gap-2 px-4 py-3 text-sm text-white font-semibold bg-[#00A6D6] rounded-lg disabled:opacity-40">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 4 ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{step === 4 ? c.submit : t('common.next')}
      </button>
    </div>
  </div>;
}

function Field({ label, required, children }) {
  return <div><div className="text-sm font-medium text-slate-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</div>{children}</div>;
}
