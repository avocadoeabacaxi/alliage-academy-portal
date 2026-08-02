import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ChevronLeft, ChevronRight, Check, Loader2, Globe } from 'lucide-react';
import RequestSuccessScreen from '@/components/RequestSuccessScreen';
import ParticipantsList from '@/components/ParticipantsList';
import ParticipationAccessFields from '@/components/ParticipationAccessFields';
import AddressFields from '@/components/AddressFields';
import ProductSelector, { resolveProductName, BRAND_OPTIONS } from '@/components/ProductSelector';

const AREA_OPTIONS = ['Comercial', 'Marketing', 'Pós-vendas', 'Consultor Técnico', 'Engenharia', 'Gestão de Pessoas', 'Outro'];
const PROBLEM_OPTIONS = ['Baixa performance comercial', 'Dificuldade de posicionamento comercial', 'Capacitação', 'Dificuldade de operação', 'Alto volume de suporte técnico', 'Novo distribuidor', 'Novo colaborador', 'Lançamento de produto', 'Outro'];
const IMPACT_OPTIONS = ['Aumento de vendas', 'Redução de chamados', 'Melhora de conhecimento técnico', 'Certificação da equipe', 'Suporte a lançamento', 'Outro'];
const NO_AUDIENCE_TYPES = ['Apoio técnico', 'Consulta de mercado', 'Licitação', 'Modificação de produto'];

export default function TrainingRequestForm({ mode = 'new' }) {
  const isPast = mode === 'past';
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [successId, setSuccessId] = useState(null);

  const [form, setForm] = useState({
    requester_name: '', requester_email: '', region: 'Brasil', region_detail: '', position: '', area: 'Comercial', area_detail: '',
    request_type: 'Novo treinamento', request_type_detail: '',
    products: [{ category: 'Extraoral', brand: '', brand_detail: '' }], product_obs: '',
    training_focus: '',
    participants_count: '6-10', participants_list: [],
    justification: '', specific_problems: [], expected_impacts: [],
    needs_deadline: false, deadline_requested: '', deadline_reason: '',
    has_multiplier: false, specialist_name: '', specialist_role: '', specialist_email: '',
    format: 'Presencial', guest_participation_mode: 'Presencial', online_platform: 'Google Meet', online_access_link: '', needs_educator_link: false,
    format_details: '', presencial_mode: 'local', location_country: '', location_city: '', location_specific: '',
    location_postal_code: '', location_street: '', location_number: '', location_complement: '', location_formatted_address: '', location_place_id: '',
    training_completed_date: ''
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArrayItem = (key, val) => {
    setForm(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const skipAudience = NO_AUDIENCE_TYPES.includes(form.request_type);

  const steps = [
    { id: 'identification', title: t('form.step1.title'), desc: t('form.step1.desc') },
    { id: 'product', title: t('form.step3.title'), desc: t('form.step3.desc') },
    { id: 'request_type', title: t('form.step2.title'), desc: t('form.step2.desc') },
    { id: 'training_focus', title: t('form.step4.title'), desc: t('form.step4.desc') },
    ...(skipAudience ? [] : [{ id: 'audience', title: t('form.step5.title'), desc: t('form.step5.desc') }]),
    { id: 'justification_urgency', title: t('form.step6.title'), desc: t('form.step6.desc') },
    { id: 'specialist', title: t('form.stepSpecialist.title'), desc: t('form.stepSpecialist.desc') },
    { id: 'logistics', title: t('form.step8.title'), desc: t('form.step8.desc') },
  ];

  const totalStepsAdjusted = steps.length;

  const canProceed = () => {
    const sid = steps[step]?.id;
    switch (sid) {
      case 'identification': return form.requester_name && form.requester_email && form.region && (form.region === 'USA' || form.region_detail.trim()) && (form.area !== 'Outro' || form.area_detail.trim());
      case 'request_type': return form.request_type && (form.request_type !== 'Outro' || form.request_type_detail.trim());
      case 'product': {
        const list = form.products || [];
        if (list.length === 0) return false;
        return list.every(p => {
          if (!p.category) return false;
          const brands = BRAND_OPTIONS[p.category] || [];
          if (brands.length === 0) return true;
          return p.brand && (p.brand !== 'Outro' || (p.brand_detail || '').trim());
        });
      }
      case 'training_focus': return form.training_focus.length > 10;
      case 'audience': return true;
      case 'justification_urgency':
        if (isPast) return form.training_completed_date && form.justification.trim().length > 0;
        return form.justification.trim().length > 0 && (!form.needs_deadline || form.deadline_requested);
      case 'specialist':
        return !form.has_multiplier || (form.specialist_name.trim() && form.specialist_role.trim() && form.specialist_email.trim());
      case 'logistics': {
        const onlineReady = form.guest_participation_mode !== 'Online' || !!form.online_access_link || form.needs_educator_link;
        const addressReady = form.guest_participation_mode === 'Online' || form.presencial_mode === 'ribeirao' || (form.location_country && form.location_city);
        return onlineReady && addressReady;
      }
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
        deadline_reason: form.deadline_reason
      };
      const transResp = await base44.functions.invoke('translateContent', { texts: textsToTranslate, source_lang: lang });
      const translations = transResp.data.translations || {};

      const today = new Date().toISOString().split('T')[0];
      const completedDate = form.training_completed_date || today;

      const { presencial_mode, ...formData } = form;
      const presencialLabel = presencial_mode === 'ribeirao' ? t('form.presencialModeRibeirao') : t('form.presencialModeLocal');
      const formatDetailsFinal = form.format === 'Presencial'
        ? [presencialLabel, form.format_details].filter(Boolean).join(' — ')
        : form.format_details;
      const productsList = (form.products || []).filter(p => p.category);
      const productNameFinal = productsList.map(resolveProductName).join(', ');
      const entity = {
        ...formData,
        format: form.guest_participation_mode === 'Online' ? 'Remoto' : form.guest_participation_mode,
        format_details: formatDetailsFinal,
        products: productsList,
        product_name: productNameFinal,
        product_category: productsList[0]?.category || '',
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
        deadline_reason: translations.deadline_reason || { [lang]: form.deadline_reason },
      };

      const created = await base44.entities.TrainingRequest.create(entity);
      if (isPast) {
        navigate(`/requests/${created.id}`);
      } else {
        setSubmitting(false);
        setSuccessId(request_id);
      }
    } catch (error) {
      setSubmitMsg('');
      setSubmitting(false);
      alert(t('form.submitError') + ': ' + error.message);
    }
  };

  if (successId) {
    return <RequestSuccessScreen requestId={successId} />;
  }

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
                <Field label={form.region === 'Brasil' ? t('form.regionDetailBrasil') : form.region === 'ROW' ? t('form.regionDetailRow') : t('form.regionDetailLatam')} required>
                  <input value={form.region_detail} onChange={e => update('region_detail', e.target.value)} className="input-base" placeholder={form.region === 'Brasil' ? t('form.regionDetailBrasilPlaceholder') : form.region === 'ROW' ? t('form.regionDetailRowPlaceholder') : t('form.regionDetailLatamPlaceholder')} />
                </Field>
              )}

            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('form.position')}>
                <input value={form.position} onChange={e => update('position', e.target.value)} className="input-base" placeholder="—" />
              </Field>
              <Field label={t('form.area')}>
                <select value={form.area} onChange={e => update('area', e.target.value)} className="input-base">
                  {AREA_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
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

        {steps[step]?.id === 'request_type' && (
          <div className="space-y-3">
            <Field label={t('form.requestType')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Novo treinamento', 'Reciclagem', 'Atualização de produto', 'Treinamento de lançamento', 'Técnico avançado', 'Treinamento clínico', 'Apoio técnico', 'Consulta de mercado', 'Licitação', 'Modificação de produto', 'Treinamento de integração', 'Outro'].map(opt => (
                  <button key={opt} onClick={() => update('request_type', opt)} className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-all ${form.request_type === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            {form.request_type === 'Outro' && (
              <Field label={t('form.requestTypeDetail')} required>
                <input value={form.request_type_detail} onChange={e => update('request_type_detail', e.target.value)} className="input-base" placeholder={t('form.requestTypeDetailPlaceholder')} />
              </Field>
            )}
          </div>
        )}

        {steps[step]?.id === 'product' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.productsLabel')} <span className="text-red-500">*</span></label>
              <p className="text-xs text-slate-400 mb-3">{t('form.productsHint')}</p>
              <ProductSelector products={form.products} onChange={(list) => update('products', list)} />
            </div>
            <Field label={t('form.productObs')}>
              <textarea value={form.product_obs} onChange={e => update('product_obs', e.target.value)} rows={2} className="input-base resize-none" placeholder={t('form.productObsPlaceholder')} />
            </Field>
          </div>
        )}

        {steps[step]?.id === 'training_focus' && (
          <Field label={t('form.trainingFocus')} required>
            <textarea value={form.training_focus} onChange={e => update('training_focus', e.target.value)} rows={8} className="input-base resize-none" placeholder={t('form.trainingFocusPlaceholder')} />
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('common.translating')}
            </p>
          </Field>
        )}

        {steps[step]?.id === 'audience' && (
          <div className="space-y-4">

            <Field label={t('form.participantsCount')}>
              <div className="grid grid-cols-4 gap-2">
                {['1-5', '6-10', '11-20', '20+'].map(opt => (
                  <button key={opt} onClick={() => update('participants_count', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.participants_count === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <div className="pt-2 border-t border-slate-100">
              <ParticipantsList participants={form.participants_list} onChange={(list) => update('participants_list', list)} />
            </div>
          </div>
        )}

        {steps[step]?.id === 'justification_urgency' && (
          <div className="space-y-4">
            {isPast && (
              <Field label={t('form.trainingCompletedDate')} required>
                <input type="date" value={form.training_completed_date} onChange={e => update('training_completed_date', e.target.value)} className="input-base" />
              </Field>
            )}
            <Field label={t('form.justification')} required>
              <textarea value={form.justification} onChange={e => update('justification', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('form.justificationPlaceholder')} />
              <p className="text-xs text-slate-400 mt-1">{t('form.justificationHint')}</p>
            </Field>
            <Field label={t('form.specificProblems')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROBLEM_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('specific_problems', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.specific_problems.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t('form.problemsHint')}</p>
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
            {!isPast && (
              <>
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
                      <p className="text-xs text-slate-400 mt-1">{t('form.deadlineReasonHint')}</p>
                    </Field>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {steps[step]?.id === 'specialist' && (
          <div className="space-y-4">
            <Field label={t('form.specialistQuestion')} required>
              <div className="flex gap-2">
                <button onClick={() => update('has_multiplier', true)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.has_multiplier ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.yes')}
                </button>
                <button onClick={() => update('has_multiplier', false)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${!form.has_multiplier ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.no')}
                </button>
              </div>
            </Field>
            <p className="text-xs text-slate-500 bg-[#00A6D6]/5 border border-[#00A6D6]/15 rounded-lg p-3">{t('form.specialistNote')}</p>
            {form.has_multiplier && (
              <div className="space-y-4 pl-3 border-l-2 border-[#00A6D6]/20">
                <Field label={t('form.specialistName')} required><input value={form.specialist_name} onChange={e => update('specialist_name', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.specialistRole')} required><input value={form.specialist_role} onChange={e => update('specialist_role', e.target.value)} className="input-base" /></Field>
                <Field label={t('form.specialistEmail')} required><input type="email" value={form.specialist_email} onChange={e => update('specialist_email', e.target.value)} className="input-base" /></Field>
              </div>
            )}
          </div>
        )}

        {steps[step]?.id === 'logistics' && (
          <div className="space-y-4">
            <ParticipationAccessFields data={form} update={update} />
            {form.guest_participation_mode !== 'Online' && (
              <div className="space-y-4 pl-3 border-l-2 border-[#00A6D6]/20">
                <Field label={t('form.presencialModeQuestion')}>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => update('presencial_mode', 'local')} className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-all ${form.presencial_mode === 'local' ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      {t('form.presencialModeLocal')}
                    </button>
                    <button onClick={() => update('presencial_mode', 'ribeirao')} className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-all ${form.presencial_mode === 'ribeirao' ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                      {t('form.presencialModeRibeirao')}
                    </button>
                  </div>
                </Field>
                {form.presencial_mode === 'local' && <AddressFields data={form} update={update} />}
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