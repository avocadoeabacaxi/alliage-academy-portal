import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ChevronLeft, ChevronRight, Check, Loader2, Globe, CalendarDays, Upload, X, Paperclip } from 'lucide-react';
import RequestSuccessScreen from '@/components/RequestSuccessScreen';
import ParticipationAccessFields from '@/components/ParticipationAccessFields';
import ParticipantsList from '@/components/ParticipantsList';
import AddressFields from '@/components/AddressFields';

const EVENT_TYPES = ['Feira / Congresso', 'Palestra', 'Lançamento de produto', 'Evento Comercial', 'Outro'];
const ALLIAGE_ROLE_OPTIONS = ['Palestrante/Apresentador', 'Instrutor hands-on', 'Moderador', 'Consultor técnico', 'Demonstração de produtos', 'Outro'];
const WHO_INVITED_OPTIONS = ['Gestor', 'Cliente estratégico', 'Distribuidor/Dealer', 'Parceiro', 'Organizador', 'Associação/Entidade', 'Outro'];
const VISITOR_OPTIONS = ['1-50', '51-100', '101-300', '301-500', '500+'];
const STRATEGIC_OBJECTIVES = ['Relacionamento com cliente estratégico', 'Prospecção', 'Lançamento/divulgação de produto', 'Posicionamento de marca', 'Networking', 'Outro'];
const IMPACT_OPTIONS = ['Leads qualificados', 'Vendas', 'Fidelização', 'Parcerias', 'Visibilidade', 'Outro'];
const PROFESSIONALS_OPTIONS = ['1', '2', '3+'];
const PRIORITY_KEYS = { 'Baixa': 'baixa', 'Média': 'media', 'Alta': 'alta', 'Crítica': 'critica' };

export default function EventRequestForm({ mode = 'new' }) {
  const isPast = mode === 'past';
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [successId, setSuccessId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const AUDIENCE_OPTIONS = [
    { value: 'Dentistas/Profissionais clínicos', label: t('audience.dentists') },
    { value: 'Radiologistas', label: t('audience.radiologists') },
    { value: 'Distribuidores/Revendedores', label: t('audience.distributors') },
    { value: 'Gestores de clínicas', label: t('audience.clinicManagers') },
    { value: 'Estudantes/Acadêmicos', label: t('audience.students') },
    { value: 'Outro', label: t('audience.other') },
  ];

  const [form, setForm] = useState({
    requester_name: '', requester_email: '', region: 'Brasil', region_detail: '',
    company_type: 'Filial Alliage', company_type_detail: '', position: '',
    event_type: 'Feira / Congresso', event_type_detail: '',
    event_name: '', event_description: '', event_organizer: '', event_website: '',
    event_start_date: '', event_end_date: '', format: 'Presencial',
    guest_participation_mode: 'Presencial', online_platform: 'Google Meet', online_access_link: '', needs_educator_link: false,
    location_country: '', location_city: '', location_specific: '', location_postal_code: '', location_street: '', location_number: '', location_complement: '', location_formatted_address: '', location_place_id: '',
    alliage_role: [], alliage_role_detail: '', who_invited: '', who_invited_detail: '',
    audience: [], expected_visitors: '51-100', participants_list: [],
    justification: '', strategic_objectives: [], strategic_objectives_detail: '',
    expected_impacts: [],
    costs_covered_by_requester: true, costs_covered_detail: '',
    professionals_needed: '1', professionals_names: '', professionals_equipment: '',
    priority: 'Média', deadline_requested: '',
    event_history: '', additional_notes: '', attachments: [],
    training_completed_date: '',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArrayItem = (key, val) => {
    setForm(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, attachments: [...prev.attachments, res.file_url] }));
    } catch (err) {
      alert('Erro ao enviar arquivo: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const steps = [
    { id: 'sec1', title: t('event.sec1.title'), desc: t('event.sec1.desc') },
    { id: 'sec2', title: t('event.sec2.title'), desc: t('event.sec2.desc') },
    { id: 'sec3', title: t('event.sec3.title'), desc: t('event.sec3.desc') },
    { id: 'sec4', title: t('event.sec4.title'), desc: t('event.sec4.desc') },
    { id: 'sec5', title: t('event.sec5.title'), desc: t('event.sec5.desc') },
    { id: 'sec6', title: t('event.sec6.title'), desc: t('event.sec6.desc') },
    { id: 'sec7', title: t('event.sec7.title'), desc: t('event.sec7.desc') },
    { id: 'sec8', title: t('event.sec8.title'), desc: t('event.sec8.desc') },
    { id: 'sec9', title: t('event.sec9.title'), desc: t('event.sec9.desc') },
    { id: 'sec10', title: t('event.sec10.title'), desc: t('event.sec10.desc') },
  ];

  const totalSteps = steps.length;

  const canProceed = () => {
    const sid = steps[step]?.id;
    switch (sid) {
      case 'sec1':
        return form.requester_name && form.requester_email && form.region &&
          (form.region === 'USA' || form.region_detail.trim()) &&
          (form.company_type !== 'Outro' || form.company_type_detail.trim());
      case 'sec2': {
        const base = form.event_name.trim() && form.event_type && (form.event_type !== 'Outro' || form.event_type_detail.trim());
        if (isPast) return base && form.event_start_date && form.event_end_date && form.training_completed_date;
        return base && form.event_start_date && form.event_end_date;
      }
      case 'sec3':
        return form.format && (form.format === 'Remoto' || (form.location_country.trim() && form.location_city.trim() && form.location_street.trim() && form.location_number.trim() && form.location_postal_code.trim()));
      case 'sec4':
        return form.alliage_role.length > 0 && (!form.alliage_role.includes('Outro') || form.alliage_role_detail.trim()) &&
          form.who_invited && (form.who_invited !== 'Outro' || form.who_invited_detail.trim());
      case 'sec5': {
        const onlineReady = !['Online', 'Híbrido'].includes(form.guest_participation_mode) || form.online_access_link || form.needs_educator_link;
        return form.audience.length > 0 && onlineReady;
      }
      case 'sec6':
        return form.justification.trim() && form.strategic_objectives.length >= 2 && form.expected_impacts.length > 0;
      case 'sec7':
        return form.costs_covered_by_requester === true || form.costs_covered_detail.trim();
      case 'sec8':
        return form.professionals_needed && form.professionals_names.trim() && form.professionals_equipment.trim();
      case 'sec9':
        return form.priority && (isPast || form.deadline_requested);
      case 'sec10':
        return form.event_history.trim();
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
        justification: form.justification,
        event_history: form.event_history,
        additional_notes: form.additional_notes,
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
        product_name: form.event_name,
        status: isPast ? 'Concluído' : 'Pendente Análise',
        decision_stage1: isPast ? 'Aprovado' : 'Pendente',
        decision_stage2: isPast ? 'Aprovado' : 'Pendente',
        date_stage1: isPast ? completedDate : undefined,
        date_stage2: isPast ? completedDate : undefined,
        training_completed_date: isPast ? completedDate : undefined,
        original_language: lang,
        event_description: translations.event_description || (form.event_description ? { [lang]: form.event_description } : {}),
        justification: translations.justification || { [lang]: form.justification },
        event_history: translations.event_history || (form.event_history ? { [lang]: form.event_history } : {}),
        additional_notes: translations.additional_notes || (form.additional_notes ? { [lang]: form.additional_notes } : {}),
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-all ${i < step ? 'bg-[#00A6D6] border-[#00A6D6] text-white' : i === step ? 'bg-white border-[#00A6D6] text-[#00A6D6]' : 'bg-white border-slate-200 text-slate-400'}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-0.5 rounded ${i < step ? 'bg-[#00A6D6]' : 'bg-slate-200'}`} />}
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
        {/* Seção 1 — Dados do Solicitante */}
        {steps[step]?.id === 'sec1' && (
          <div className="space-y-4">
            <Field label={t('form.requesterName')} required>
              <input value={form.requester_name} onChange={e => update('requester_name', e.target.value)} className="input-base" placeholder="—" />
            </Field>
            <Field label={t('form.requesterEmail')} required>
              <input type="email" value={form.requester_email} onChange={e => update('requester_email', e.target.value)} className="input-base" placeholder="—" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('form.position')}>
                <input value={form.position} onChange={e => update('position', e.target.value)} className="input-base" placeholder="—" />
              </Field>
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
          </div>
        )}

        {/* Seção 2 — Informações do Evento */}
        {steps[step]?.id === 'sec2' && (
          <div className="space-y-4">
            {isPast && (
              <Field label={t('form.trainingCompletedDate')} required>
                <input type="date" value={form.training_completed_date} onChange={e => update('training_completed_date', e.target.value)} className="input-base" />
              </Field>
            )}
            <Field label={t('event.name')} required>
              <input value={form.event_name} onChange={e => update('event_name', e.target.value)} className="input-base" placeholder={t('event.namePlaceholder')} />
            </Field>
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
            <Field label={t('event.organizer')}>
              <input value={form.event_organizer} onChange={e => update('event_organizer', e.target.value)} className="input-base" />
            </Field>
            <Field label={t('event.website')}>
              <input value={form.event_website} onChange={e => update('event_website', e.target.value)} className="input-base" placeholder="https://" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('event.startDate')} required>
                <input type="date" value={form.event_start_date} onChange={e => update('event_start_date', e.target.value)} className="input-base" />
              </Field>
              <Field label={t('event.endDate')} required>
                <input type="date" value={form.event_end_date} onChange={e => update('event_end_date', e.target.value)} className="input-base" />
              </Field>
            </div>
            <Field label={t('event.format')}>
              <div className="flex gap-2">
                {['Presencial', 'Remoto', 'Híbrido'].map(opt => (
                  <button key={opt} onClick={() => update('format', opt)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.format === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                    {t(`format.${opt.toLowerCase().replace('í', 'i')}`)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Seção 3 — Localização e Logística */}
        {steps[step]?.id === 'sec3' && (
          <div className="space-y-4">
            {form.format !== 'Remoto' && <AddressFields data={form} update={update} />}
          </div>
        )}

        {/* Seção 4 — Natureza do Convite */}
        {steps[step]?.id === 'sec4' && (
          <div className="space-y-4">
            <Field label={t('event.alliageRole')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALLIAGE_ROLE_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('alliage_role', opt)} className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${form.alliage_role.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              {form.alliage_role.includes('Outro') && (
                <input value={form.alliage_role_detail} onChange={e => update('alliage_role_detail', e.target.value)} className="input-base mt-2" placeholder={t('event.alliageRoleDetail')} />
              )}
            </Field>
            <Field label={t('event.whoInvited')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WHO_INVITED_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => update('who_invited', opt)} className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${form.who_invited === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              {form.who_invited === 'Outro' && (
                <input value={form.who_invited_detail} onChange={e => update('who_invited_detail', e.target.value)} className="input-base mt-2" placeholder={t('event.whoInvitedDetail')} />
              )}
            </Field>
          </div>
        )}

        {/* Seção 5 — Público e Alcance */}
        {steps[step]?.id === 'sec5' && (
          <div className="space-y-4">
            <Field label={t('form.audience')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AUDIENCE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => toggleArrayItem('audience', opt.value)} className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${form.audience.includes(opt.value) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt.label}
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
            {!isPast && <><ParticipationAccessFields data={form} update={update} /><ParticipantsList participants={form.participants_list} onChange={(list) => update('participants_list', list)} /></>}
          </div>
        )}

        {/* Seção 6 — Justificativa Estratégica */}
        {steps[step]?.id === 'sec6' && (
          <div className="space-y-4">
            <Field label={t('event.whyImportant')} required>
              <textarea value={form.justification} onChange={e => update('justification', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('event.whyImportantPlaceholder')} />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('common.translating')}
              </p>
            </Field>
            <Field label={t('event.strategicObjectives')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STRATEGIC_OBJECTIVES.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('strategic_objectives', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.strategic_objectives.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
              {form.strategic_objectives.includes('Outro') && (
                <input value={form.strategic_objectives_detail} onChange={e => update('strategic_objectives_detail', e.target.value)} className="input-base mt-2" placeholder={t('event.strategicObjectivesDetail')} />
              )}
            </Field>
            <Field label={t('event.expectedImpact')} required>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {IMPACT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('expected_impacts', opt)} className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${form.expected_impacts.includes(opt) ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Seção 7 — Análise de Custos */}
        {steps[step]?.id === 'sec7' && (
          <div className="space-y-4">
            <Field label={t('event.costsCovered')} required>
              <div className="flex gap-2">
                <button onClick={() => update('costs_covered_by_requester', true)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${form.costs_covered_by_requester ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.yes')}
                </button>
                <button onClick={() => update('costs_covered_by_requester', false)} className={`px-4 py-2 text-sm rounded-lg border transition-all ${!form.costs_covered_by_requester ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 text-slate-700'}`}>
                  {t('common.no')}
                </button>
              </div>
            </Field>
            {!form.costs_covered_by_requester && (
              <Field label={t('event.costsCoveredDetail')} required>
                <textarea value={form.costs_covered_detail} onChange={e => update('costs_covered_detail', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('event.costsCoveredDetailPlaceholder')} />
              </Field>
            )}
          </div>
        )}

        {/* Seção 8 — Recursos Necessários */}
        {steps[step]?.id === 'sec8' && (
          <div className="space-y-4">
            <Field label={t('event.professionalsNeeded')} required>
              <div className="grid grid-cols-3 gap-2">
                {PROFESSIONALS_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => update('professionals_needed', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.professionals_needed === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('event.professionalsNames')} required>
              <textarea value={form.professionals_names} onChange={e => update('professionals_names', e.target.value)} rows={2} className="input-base resize-none" placeholder={t('event.professionalsNamesPlaceholder')} />
            </Field>
            <Field label={t('event.professionalsEquipment')} required>
              <textarea value={form.professionals_equipment} onChange={e => update('professionals_equipment', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('event.professionalsEquipmentPlaceholder')} />
            </Field>
          </div>
        )}

        {/* Seção 9 — Priorização */}
        {steps[step]?.id === 'sec9' && (
          <div className="space-y-4">
            <Field label={t('form.priority')} required>
              <div className="grid grid-cols-4 gap-2">
                {['Baixa', 'Média', 'Alta', 'Crítica'].map(opt => (
                  <button key={opt} onClick={() => update('priority', opt)} className={`px-3 py-2 text-sm rounded-lg border transition-all ${form.priority === opt ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                    {t(`priority.${PRIORITY_KEYS[opt]}`)}
                  </button>
                ))}
              </div>
            </Field>
            {!isPast && (
              <Field label={t('event.confirmDeadline')} required>
                <input type="date" value={form.deadline_requested} onChange={e => update('deadline_requested', e.target.value)} className="input-base" />
              </Field>
            )}
          </div>
        )}

        {/* Seção 10 — Informações Complementares */}
        {steps[step]?.id === 'sec10' && (
          <div className="space-y-4">
            <Field label={t('event.history')} required>
              <textarea value={form.event_history} onChange={e => update('event_history', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('event.historyPlaceholder')} />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('common.translating')}
              </p>
            </Field>
            <Field label={t('event.additionalNotes')}>
              <textarea value={form.additional_notes} onChange={e => update('additional_notes', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('event.additionalNotesPlaceholder')} />
            </Field>
            <Field label={t('event.attachments')}>
              <p className="text-xs text-slate-400 mb-2">{t('event.attachmentsHint')}</p>
              <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#00A6D6] border border-[#00A6D6] rounded-lg hover:bg-[#00A6D6]/5 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? t('event.uploading') : t('event.uploadFile')}
              </button>
              {form.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {form.attachments.map((url, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#003B5C] truncate hover:underline">
                        <Paperclip className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{url.split('/').pop()}</span>
                      </a>
                      <button onClick={() => update('attachments', form.attachments.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
            onClick={() => canProceed() && handleSubmit()}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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