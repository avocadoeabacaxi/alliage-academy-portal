import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ChevronLeft, ChevronRight, Check, Loader2, Globe } from 'lucide-react';

const PRODUCT_CATEGORIES = ['Extraoral', 'Scanner Intraoral', 'Software', 'Consultórios', 'Raio-x', 'Sensor', 'Periféricos', 'Outro'];
const AUDIENCE_OPTIONS = ['Equipe interna', 'Distribuidor', 'Cliente final', 'Misto'];
const PROBLEM_OPTIONS = ['Baixa performance comercial', 'Capacitação', 'Dificuldade de operação', 'Alto volume de suporte técnico', 'Novo distribuidor', 'Novo colaborador', 'Lançamento de produto', 'Outro'];
const IMPACT_OPTIONS = ['Aumento de vendas', 'Redução de chamados', 'Melhora de conhecimento técnico', 'Certificação da equipe', 'Suporte a lançamento', 'Outro'];

export default function TrainingRequestForm({ mode = 'new' }) {
  const isPast = mode === 'past';
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const totalSteps = 8;
  const [form, setForm] = useState({
    requester_name: '', requester_email: '', region: 'Brasil', company_type: 'Filial Alliage', position: '', area: 'Comercial',
    request_type: 'Novo treinamento',
    product_category: 'Extraoral', product_name: '',
    training_focus: '',
    audience: [], participants_count: '6-10',
    justification: '', specific_problems: [], expected_impacts: [], consequence_60_days: '',
    priority: 'Média', deadline_requested: '', deadline_reason: '',
    has_multiplier: false, specialist_name: '', specialist_role: '', specialist_email: '',
    format: 'Remoto', format_details: '', location_country: '', location_city: '', location_specific: '',
    training_completed_date: ''
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArrayItem = (key, val) => {
    setForm(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const steps = [
    { title: t('form.step1.title'), desc: t('form.step1.desc') },
    { title: t('form.step2.title'), desc: t('form.step2.desc') },
    { title: t('form.step3.title'), desc: t('form.step3.desc') },
    { title: t('form.step4.title'), desc: t('form.step4.desc') },
    { title: t('form.step5.title'), desc: t('form.step5.desc') },
    { title: isPast ? t('form.pastDate.title') : t('form.step7.title'), desc: isPast ? t('form.pastDate.desc') : t('form.step7.desc') },
    { title: t('form.step8.title'), desc: t('form.step8.desc') },
  ];

  const totalStepsAdjusted = steps.length;

  const canProceed = () => {
    switch (step) {
      case 0: return form.requester_name && form.requester_email && form.region;
      case 1: return form.request_type;
      case 2: return form.product_name;
      case 3: return form.training_focus.length > 10;
      case 4: return form.audience.length > 0;
      case 5: return isPast ? form.training_completed_date : (form.priority && form.deadline_requested);
      default: return true;
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
        training_focus: form.training_focus,
        justification: form.justification,
        consequence_60_days: form.consequence_60_days,
        deadline_reason: form.deadline_reason
      };
      const transResp = await base44.functions.invoke('translateContent', { texts: textsToTranslate, source_lang: lang });
      const translations = transResp.data.translations || {};

      const today = new Date().toISOString().split('T')[0];
      const completedDate = form.training_completed_date || today;

      const entity = {
        ...form,
        request_id,
        request_category: 'Treinamento / Apoio Técnico',
        status: isPast ? 'Concluído' : 'Pendente Análise',
        decision_stage1: isPast ? 'Aprovado' : 'Pendente',
        decision_stage2: isPast ? 'Aprovado' : 'Pendente',
        date_stage1: isPast ? completedDate : undefined,
        date_stage2: isPast ? completedDate : undefined,
        training_completed_date: isPast ? completedDate : undefined,
        original_language: lang,
        training_focus: translations.training_focus || { [lang]: form.training_focus },
        justification: translations.justification || { [lang]: form.justification },
        consequence_60_days: translations.consequence_60_days || { [lang]: form.consequence_60_days },
        deadline_reason: translations.deadline_reason || { [lang]: form.deadline_reason },
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

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003B5C]">{isPast ? t('form.pastTitle') : t('form.title')}</h1>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
          <Globe className="w-3.5 h-3.5" />
          <span>{t('form.step')} {step + 1} {t('form.of')} {totalStepsAdjusted}</span>
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
        {step === 0 && (
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
              <Field label={t('form.companyType')}>
                <select value={form.company_type} onChange={e => update('company_type', e.target.value)} className="input-base">
                  {['Filial Alliage', 'Distribuidor/Dealer', 'Cliente Final', 'Outro'].map(r => <option key={r} value={r}>{t(`company.${r === 'Filial Alliage' ? 'filial' : r === 'Distribuidor/Dealer' ? 'distribuidor' : r === 'Cliente Final' ? 'cliente' : 'outro'}`)}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('form.position')}>
                <input value={form.position} onChange={e => update('position', e.target.value)} className="input-base" placeholder="—" />
              </Field>
              <Field label={t('form.area')}>
                <select value={form.area} onChange={e => update('area', e.target.value)} className="input-base">
                  {['Comercial', 'Aplicação Clínica', 'Educação', 'Marketing', 'Pós-vendas', 'Outro'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Field label={t('form.requestType')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Novo treinamento', 'Reciclagem', 'Atualização de produto', 'Treinamento de lançamento', 'Técnico avançado', 'Clínico', 'Outro'].map(opt => (
                  <button key={opt} onClick={() => update('request_type', opt)} className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-all ${form.request_type === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label={t('form.productCategory')}>
              <select value={form.product_category} onChange={e => update('product_category', e.target.value)} className="input-base">
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t('form.productName')} required>
              <input value={form.product_name} onChange={e => update('product_name', e.target.value)} className="input-base" placeholder="—" />
            </Field>
          </div>
        )}

        {step === 3 && (
          <Field label={t('form.trainingFocus')} required>
            <textarea value={form.training_focus} onChange={e => update('training_focus', e.target.value)} rows={8} className="input-base resize-none" placeholder={t('form.trainingFocusPlaceholder')} />
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('common.translating')}
            </p>
          </Field>
        )}

        {step === 4 && (
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
            <Field label={t('form.participantsCount')}>
              <div className="grid grid-cols-4 gap-2">
                {['1-5', '6-10', '11-20', '20+'].map(opt => (
                  <button key={opt} onClick={() => update('participants_count', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.participants_count === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 5 && isPast ? (
          <div className="space-y-4">
            <Field label={t('form.trainingCompletedDate')} required>
              <input type="date" value={form.training_completed_date} onChange={e => update('training_completed_date', e.target.value)} className="input-base" />
            </Field>
            <Field label={t('form.priority')}>
              <div className="grid grid-cols-4 gap-2">
                {['Baixa', 'Média', 'Alta', 'Crítica'].map(opt => (
                  <button key={opt} onClick={() => update('priority', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.priority === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {t(`priority.${opt.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        ) : step === 5 && !isPast && (
          <div className="space-y-4">
            <Field label={t('form.justification')} required>
              <textarea value={form.justification} onChange={e => update('justification', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('form.justificationPlaceholder')} />
            </Field>
            <Field label={t('form.specificProblems')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROBLEM_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('specific_problems', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.specific_problems.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('form.expectedImpacts')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {IMPACT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('expected_impacts', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.expected_impacts.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('form.consequence60')}>
              <textarea value={form.consequence_60_days} onChange={e => update('consequence_60_days', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('form.consequence60Placeholder')} />
            </Field>
          </div>
        )}

        {isPast ? (
          step === 6 && (
            <div className="space-y-4">
              <Field label={t('form.justification')} required>
                <textarea value={form.justification} onChange={e => update('justification', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('form.justificationPlaceholder')} />
              </Field>
              <Field label={t('form.specificProblems')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROBLEM_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => toggleArrayItem('specific_problems', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.specific_problems.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t('form.expectedImpacts')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {IMPACT_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => toggleArrayItem('expected_impacts', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.expected_impacts.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )
        ) : (
          step === 6 && (
            <div className="space-y-4">
              <Field label={t('form.priority')}>
                <div className="grid grid-cols-4 gap-2">
                  {['Baixa', 'Média', 'Alta', 'Crítica'].map(opt => (
                    <button key={opt} onClick={() => update('priority', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.priority === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      {t(`priority.${opt.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t('form.deadlineRequested')} required>
                <input type="date" value={form.deadline_requested} onChange={e => update('deadline_requested', e.target.value)} className="input-base" />
              </Field>
              <Field label={t('form.deadlineReason')}>
                <textarea value={form.deadline_reason} onChange={e => update('deadline_reason', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('form.deadlineReasonPlaceholder')} />
              </Field>
            </div>
          )
        )}

        {step === totalStepsAdjusted - 1 && (
          <div className="space-y-4">
            <Field label={t('form.hasMultiplier')}>
              <div className="flex gap-2">
                <button onClick={() => update('has_multiplier', true)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.has_multiplier ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.yes')}
                </button>
                <button onClick={() => update('has_multiplier', false)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${!form.has_multiplier ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.no')}
                </button>
              </div>
            </Field>
            {form.has_multiplier && (
              <div className="space-y-4 pl-3 border-l-2 border-[#00A6D6]/20">
                <Field label={t('form.specialistName')}><input value={form.specialist_name} onChange={e => update('specialist_name', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.specialistRole')}><input value={form.specialist_role} onChange={e => update('specialist_role', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.specialistEmail')}><input type="email" value={form.specialist_email} onChange={e => update('specialist_email', e.target.value)} className="input-base" /></Field>
              </div>
            )}
            <Field label={t('form.format')}>
              <div className="flex gap-2">
                {['Remoto', 'Presencial'].map(opt => (
                  <button key={opt} onClick={() => update('format', opt)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.format === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                    {t(`format.${opt.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </Field>
            {form.format === 'Presencial' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-3 border-l-2 border-[#00A6D6]/20">
                <Field label={t('form.locationCountry')}><input value={form.location_country} onChange={e => update('location_country', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.locationCity')}><input value={form.location_city} onChange={e => update('location_city', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.locationSpecific')}><input value={form.location_specific} onChange={e => update('location_specific', e.target.value)} className="input-base" /></Field>
              </div>
            )}
            <Field label={t('form.formatDetails')}>
              <textarea value={form.format_details} onChange={e => update('format_details', e.target.value)} rows={2} className="input-base resize-none" />
            </Field>
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
        {step < totalStepsAdjusted - 1 ? (
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