import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ChevronLeft, ChevronRight, Check, Loader2, Globe, MapPin, CalendarDays, Users, Package } from 'lucide-react';

const EVENT_TYPES = [
  'Feira / Congresso',
  'Demonstração',
  'Ação de marketing',
  'Workshop',
  'Lançamento de produto',
  'Treinamento em evento',
  'Reunião comercial',
  'Outro',
];

const AUDIENCE_OPTIONS = ['Equipe interna', 'Distribuidor', 'Cliente final', 'Misto'];
const VISITOR_OPTIONS = ['1-50', '51-100', '101-300', '301-500', '500+'];

export default function EventRequestForm({ mode = 'new' }) {
  const isPast = mode === 'past';
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const [form, setForm] = useState({
    requester_name: '', requester_email: '', region: 'Brasil', region_detail: '',
    company_type: 'Filial Alliage', company_type_detail: '', position: '', area: 'Comercial', area_detail: '',
    event_type: 'Feira / Congresso', event_type_detail: '',
    event_name: '', event_description: '',
    event_start_date: '', event_end_date: '',
    expected_visitors: '51-100', booth_space: '',
    product_name: '', product_obs: '',
    training_focus: '',
    audience: [],
    justification: '', priority: 'Média',
    needs_deadline: false, deadline_requested: '', deadline_reason: '',
    format: 'Presencial', format_details: '',
    location_country: '', location_city: '', location_specific: '',
    training_completed_date: '',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArrayItem = (key, val) => {
    setForm(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const steps = [
    { id: 'identification', title: t('form.step1.title'), desc: t('form.step1.desc') },
    { id: 'event_type', title: t('event.step2.title'), desc: t('event.step2.desc') },
    { id: 'event_details', title: t('event.step3.title'), desc: t('event.step3.desc') },
    { id: 'location', title: t('event.step4.title'), desc: t('event.step4.desc') },
    { id: 'product', title: t('form.step3.title'), desc: t('event.step5.desc') },
    { id: 'audience', title: t('form.step5.title'), desc: t('form.step5.desc') },
    { id: 'justification', title: t('form.step6.title'), desc: t('event.step7.desc') },
  ];

  const totalSteps = steps.length;

  const canProceed = () => {
    const sid = steps[step]?.id;
    switch (sid) {
      case 'identification':
        return form.requester_name && form.requester_email && form.region &&
          (form.region === 'USA' || form.region_detail.trim()) &&
          (form.company_type !== 'Outro' || form.company_type_detail.trim()) &&
          (form.area !== 'Outro' || form.area_detail.trim());
      case 'event_type':
        return form.event_type && (form.event_type !== 'Outro' || form.event_type_detail.trim());
      case 'event_details':
        if (isPast) return form.event_name.trim() && form.event_description.trim() && form.training_completed_date;
        return form.event_name.trim() && form.event_description.trim() && form.event_start_date;
      case 'location':
        return form.format && (form.format === 'Remoto' || (form.location_country.trim() && form.location_city.trim()));
      case 'product':
        return form.product_name.trim();
      case 'audience':
        return form.audience.length > 0;
      case 'justification':
        return form.justification.trim() && form.priority && (!form.needs_deadline || form.deadline_requested);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitMsg(t('form.generatingId'));
    try {
      const idResp = await base44.functions.invoke('generateRequestId', {});
      const request_id = idResp.data.request_id;

      setSubmitMsg(t('form.translatingFields'));
      const textsToTranslate = {
        event_description: form.event_description,
        training_focus: form.training_focus,
        justification: form.justification,
        deadline_reason: form.deadline_reason,
      };
      const transResp = await base44.functions.invoke('translateContent', { texts: textsToTranslate, source_lang: lang });
      const translations = transResp.data.translations || {};

      const today = new Date().toISOString().split('T')[0];
      const completedDate = form.training_completed_date || today;

      const entity = {
        ...form,
        request_id,
        request_category: 'Evento',
        request_type: 'Outro',
        request_type_detail: form.event_type,
        status: isPast ? 'Concluído' : 'Pendente Análise',
        decision_stage1: isPast ? 'Aprovado' : 'Pendente',
        decision_stage2: isPast ? 'Aprovado' : 'Pendente',
        date_stage1: isPast ? completedDate : undefined,
        date_stage2: isPast ? completedDate : undefined,
        training_completed_date: isPast ? completedDate : undefined,
        original_language: lang,
        event_description: translations.event_description || { [lang]: form.event_description },
        training_focus: translations.training_focus || (form.training_focus ? { [lang]: form.training_focus } : {}),
        justification: translations.justification || { [lang]: form.justification },
        deadline_reason: translations.deadline_reason || (form.deadline_reason ? { [lang]: form.deadline_reason } : {}),
      };

      const created = await base44.entities.TrainingRequest.create(entity);
      navigate(`/requests/${created.id}`);
    } catch (error) {
      setSubmitMsg('');
      setSubmitting(false);
      alert(t('form.submitError') + ': ' + error.message);
    }
  };

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 text-[#00A6D6] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">{submitMsg}</p>
      </div>
    );
  }

  const priorityField = (
    <Field label={t('form.priority')}>
      <div className="grid grid-cols-4 gap-2">
        {['Baixa', 'Média', 'Alta', 'Crítica'].map(opt => (
          <button key={opt} onClick={() => update('priority', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.priority === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
            {t(`priority.${opt.toLowerCase()}`)}
          </button>
        ))}
      </div>
    </Field>
  );

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003B5C] flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-[#00A6D6]" />
          {isPast ? t('event.pastTitle') : t('event.title')}
        </h1>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
          <Globe className="w-3.5 h-3.5" />
          <span>{t('form.step')} {step + 1} {t('form.of')} {totalSteps}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${i < step ? 'bg-[#00A6D6] border-[#00A6D6] text-white' : i === step ? 'bg-white border-[#00A6D6] text-[#00A6D6]' : 'bg-white border-slate-200 text-slate-400'}`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${i < step ? 'bg-[#00A6D6]' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3">
          <h2 className="text-lg font-semibold text-slate-900">{steps[step].title}</h2>
          <p className="text-sm text-slate-500">{steps[step].desc}</p>
        </div>
      </div>

      {/* Form steps */}
      <div className="card-modern p-5 mb-6 min-h-[300px]">
        {steps[step]?.id === 'identification' && (
          <div className="space-y-4">
            <Field label={t('form.requesterName')} required>
              <input value={form.requester_name} onChange={e => update('requester_name', e.target.value)} className="input-base" placeholder="—" />
            </Field>
            <Field label={t('form.requesterEmail')} required>
              <input type="email" value={form.requester_email} onChange={e => update('requester_email', e.target.value)} className="input-base" placeholder="—" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('form.region')} required>
                <select value={form.region} onChange={e => update('region', e.target.value)} className="input-base">
                  {['Brasil', 'LATAM', 'USA', 'ROW'].map(r => <option key={r} value={r}>{t(`region.${r.toLowerCase()}`)}</option>)}
                </select>
              </Field>
              {form.region !== 'USA' && (
                <Field label={form.region === 'Brasil' ? t('form.regionDetailBrasil') : t('form.regionDetailLatam')} required>
                  <input value={form.region_detail} onChange={e => update('region_detail', e.target.value)} className="input-base" placeholder={form.region === 'Brasil' ? t('form.regionDetailBrasilPlaceholder') : t('form.regionDetailLatamPlaceholder')} />
                </Field>
              )}
              <Field label={t('form.companyType')}>
                <select value={form.company_type} onChange={e => update('company_type', e.target.value)} className="input-base">
                  {['Filial Alliage', 'Distribuidor/Dealer', 'Outro'].map(r => <option key={r} value={r}>{t(`company.${r === 'Filial Alliage' ? 'filial' : r === 'Distribuidor/Dealer' ? 'distribuidor' : 'outro'}`)}</option>)}
                </select>
              </Field>
              {form.company_type === 'Outro' && (
                <Field label={t('form.companyTypeDetail')} required>
                  <input value={form.company_type_detail} onChange={e => update('company_type_detail', e.target.value)} className="input-base" placeholder={t('form.companyTypeDetailPlaceholder')} />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('form.position')}>
                <input value={form.position} onChange={e => update('position', e.target.value)} className="input-base" placeholder="—" />
              </Field>
              <Field label={t('form.area')}>
                <select value={form.area} onChange={e => update('area', e.target.value)} className="input-base">
                  {['Comercial', 'Marketing', 'Pós-vendas', 'Consultor Técnico', 'Engenharia', 'Gestão de Pessoas', 'Outro'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              {form.area === 'Outro' && (
                <Field label={t('form.areaDetail')} required>
                  <input value={form.area_detail} onChange={e => update('area_detail', e.target.value)} className="input-base" placeholder={t('form.areaDetailPlaceholder')} />
                </Field>
              )}
            </div>
          </div>
        )}

        {steps[step]?.id === 'event_type' && (
          <div className="space-y-3">
            <Field label={t('event.typeLabel')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVENT_TYPES.map(opt => (
                  <button key={opt} onClick={() => update('event_type', opt)} className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-all ${form.event_type === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            {form.event_type === 'Outro' && (
              <Field label={t('event.typeDetail')} required>
                <input value={form.event_type_detail} onChange={e => update('event_type_detail', e.target.value)} className="input-base" placeholder={t('event.typeDetailPlaceholder')} />
              </Field>
            )}
          </div>
        )}

        {steps[step]?.id === 'event_details' && (
          <div className="space-y-4">
            {isPast && (
              <Field label={t('form.trainingCompletedDate')} required>
                <input type="date" value={form.training_completed_date} onChange={e => update('training_completed_date', e.target.value)} className="input-base" />
              </Field>
            )}
            <Field label={t('event.name')} required>
              <input value={form.event_name} onChange={e => update('event_name', e.target.value)} className="input-base" placeholder={t('event.namePlaceholder')} />
            </Field>
            <Field label={t('event.description')} required>
              <textarea value={form.event_description} onChange={e => update('event_description', e.target.value)} rows={5} className="input-base resize-none" placeholder={t('event.descriptionPlaceholder')} />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('common.translating')}
              </p>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('event.startDate')} required>
                <input type="date" value={form.event_start_date} onChange={e => update('event_start_date', e.target.value)} className="input-base" />
              </Field>
              <Field label={t('event.endDate')}>
                <input type="date" value={form.event_end_date} onChange={e => update('event_end_date', e.target.value)} className="input-base" />
              </Field>
            </div>
            <Field label={t('event.boothSpace')}>
              <input value={form.booth_space} onChange={e => update('booth_space', e.target.value)} className="input-base" placeholder={t('event.boothSpacePlaceholder')} />
            </Field>
          </div>
        )}

        {steps[step]?.id === 'location' && (
          <div className="space-y-4">
            <Field label={t('form.format')} required>
              <div className="flex gap-2">
                {['Presencial', 'Remoto'].map(opt => (
                  <button key={opt} onClick={() => update('format', opt)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.format === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                    {t(`format.${opt.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </Field>
            {form.format === 'Presencial' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-3 border-l-2 border-[#00A6D6]/20">
                <Field label={t('form.locationCountry')} required><input value={form.location_country} onChange={e => update('location_country', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.locationCity')} required><input value={form.location_city} onChange={e => update('location_city', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.locationSpecific')}><input value={form.location_specific} onChange={e => update('location_specific', e.target.value)} className="input-base" placeholder={t('event.locationSpecificPlaceholder')} /></Field>
              </div>
            )}
            <Field label={t('form.formatDetails')}>
              <textarea value={form.format_details} onChange={e => update('format_details', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('event.formatDetailsPlaceholder')} />
            </Field>
          </div>
        )}

        {steps[step]?.id === 'product' && (
          <div className="space-y-4">
            <Field label={t('event.productName')} required>
              <input value={form.product_name} onChange={e => update('product_name', e.target.value)} className="input-base" placeholder={t('event.productNamePlaceholder')} />
            </Field>
            <Field label={t('form.trainingFocus')}>
              <textarea value={form.training_focus} onChange={e => update('training_focus', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('event.contentPlaceholder')} />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('common.translating')}
              </p>
            </Field>
            <Field label={t('form.productObs')}>
              <textarea value={form.product_obs} onChange={e => update('product_obs', e.target.value)} rows={2} className="input-base resize-none" placeholder={t('form.productObsPlaceholder')} />
            </Field>
          </div>
        )}

        {steps[step]?.id === 'audience' && (
          <div className="space-y-4">
            <Field label={t('form.audience')}>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('audience', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.audience.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('event.expectedVisitors')}>
              <div className="grid grid-cols-5 gap-2">
                {VISITOR_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => update('expected_visitors', opt)} className={`px-2 py-2 text-sm rounded-lg border transition-all ${form.expected_visitors === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {steps[step]?.id === 'justification' && (
          <div className="space-y-4">
            <Field label={t('form.justification')} required>
              <textarea value={form.justification} onChange={e => update('justification', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('event.justificationPlaceholder')} />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('common.translating')}
              </p>
            </Field>
            {priorityField}
            <Field label={t('form.needDeadline')}>
              <div className="flex gap-2">
                <button onClick={() => update('needs_deadline', true)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.needs_deadline ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.yes')}
                </button>
                <button onClick={() => update('needs_deadline', false)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${!form.needs_deadline ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.no')}
                </button>
              </div>
            </Field>
            {form.needs_deadline && (
              <div className="space-y-4 pl-3 border-l-2 border-[#00A6D6]/20">
                <Field label={t('form.deadlineRequested')} required>
                  <input type="date" value={form.deadline_requested} onChange={e => update('deadline_requested', e.target.value)} className="input-base" />
                </Field>
                <Field label={t('form.deadlineReason')}>
                  <textarea value={form.deadline_reason} onChange={e => update('deadline_reason', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('form.deadlineReasonPlaceholder')} />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        {step < totalSteps - 1 ? (
          <button
            onClick={() => canProceed() && setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-[#00A6D6] rounded-lg hover:bg-[#0094BD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            {t('common.submit')}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}