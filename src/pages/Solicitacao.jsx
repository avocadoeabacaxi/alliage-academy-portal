import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Loader2, Check, Copy } from 'lucide-react';

export default function Solicitacao() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    region: 'Brasil',
    requester_name: '',
    requester_email: '',
    deadline_requested: '',
    audience_text: '',
    product_name: '',
    priority: 'Média',
    justification: '',
    format: 'Remoto',
    format_details: ''
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const formatDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const buildSummary = () => {
    const lines = [
      `${t('form.solicitacaoTitle')}`,
      '',
      `${t('form.regionalSolicitante')}: ${t(`region.${form.region.toLowerCase()}`)}`,
      `${t('form.requesterName')}: ${form.requester_name || '—'}`,
      `${t('form.requesterEmail')}: ${form.requester_email || '—'}`,
      `${t('form.ateQuando')}: ${formatDate(form.deadline_requested)}`,
      `${t('form.quemTreinado')}: ${form.audience_text || '—'}`,
      `${t('form.produtoTema')}: ${form.product_name || '—'}`,
      `${t('form.priority')}: ${t(`priority.${form.priority.toLowerCase()}`)}`,
      `${t('form.objetivoDor')}: ${form.justification || '—'}`,
      `${t('form.formatoDesejado')}: ${form.format === 'Remoto' ? t('format.online_ao_vivo') : t('format.presencial')}`,
    ];
    if (form.format_details) {
      lines.push(`${t('form.observacoes')}: ${form.format_details}`);
    }
    return lines.join('\n');
  };

  const hasContent = form.requester_name || form.requester_email || form.product_name || form.justification || form.audience_text;

  const handleCopy = () => {
    navigator.clipboard.writeText(buildSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setForm({
      region: 'Brasil', requester_name: '', requester_email: '', deadline_requested: '',
      audience_text: '', product_name: '', priority: 'Média', justification: '', format: 'Remoto', format_details: ''
    });
  };

  const canSubmit = form.requester_name && form.requester_email && form.region && form.product_name && form.deadline_requested && form.justification;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitMsg(t('form.generatingId'));
    try {
      const idResp = await base44.functions.invoke('generateRequestId', {});
      const request_id = idResp.data.request_id;

      setSubmitMsg(t('form.translatingFields'));
      const textsToTranslate = { justification: form.justification };
      const transResp = await base44.functions.invoke('translateContent', { texts: textsToTranslate, source_lang: lang });
      const translations = transResp.data.translations || {};

      const entity = {
        request_id,
        request_category: 'Treinamento / Apoio Técnico',
        status: 'Pendente Análise',
        priority: form.priority,
        requester_name: form.requester_name,
        requester_email: form.requester_email,
        region: form.region,
        company_type: 'Filial Alliage',
        area: 'Comercial',
        request_type: 'Novo treinamento',
        product_category: 'Outro',
        product_name: form.product_name,
        training_focus: { [lang]: form.justification },
        audience: form.audience_text ? [form.audience_text] : [],
        participants_count: '6-10',
        justification: translations.justification || { [lang]: form.justification },
        deadline_requested: form.deadline_requested,
        format: form.format,
        format_details: form.format_details,
        original_language: lang,
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
    <div className="max-w-5xl mx-auto p-4 lg:p-6 animate-fade-in">
      {/* Header */}
      <div className="bg-[#003B5C] rounded-2xl p-6 mb-5 text-center shadow-lg shadow-[#003B5C]/10">
        <h1 className="text-xl lg:text-2xl font-bold text-white">{t('form.solicitacaoTitle')}</h1>
        <p className="text-sm text-cyan-200/70 mt-1.5 max-w-2xl mx-auto">{t('form.solicitacaoSubtitle')}</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-sm">
            {/* Badge + heading */}
            <div className="mb-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#00A6D6]/10 text-[#003B5C] mb-2">
                {t('form.badge')}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{t('form.dadosSolicitacao')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('form.helperText')}</p>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <Field label={t('form.regionalSolicitante')} required>
                <select value={form.region} onChange={e => update('region', e.target.value)} className="input-base">
                  {['Brasil', 'LATAM', 'USA', 'ROW'].map(r => <option key={r} value={r}>{t(`region.${r.toLowerCase()}`)}</option>)}
                </select>
              </Field>

              <Field label={t('form.requesterName')} required>
                <input value={form.requester_name} onChange={e => update('requester_name', e.target.value)} className="input-base" placeholder="Ex.: João Silva" />
              </Field>

              <Field label={t('form.requesterEmail')} required>
                <input type="email" value={form.requester_email} onChange={e => update('requester_email', e.target.value)} className="input-base" placeholder="nome@empresa.com" />
              </Field>

              <Field label={t('form.ateQuando')} required>
                <input type="date" value={form.deadline_requested} onChange={e => update('deadline_requested', e.target.value)} className="input-base" />
              </Field>

              <Field label={t('form.quemTreinado')} required>
                <textarea value={form.audience_text} onChange={e => update('audience_text', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('form.quemTreinadoPlaceholder')} />
                <p className="text-xs text-slate-400 mt-1">{t('form.quemTreinadoHelper')}</p>
              </Field>

              <Field label={t('form.produtoTema')} required>
                <input value={form.product_name} onChange={e => update('product_name', e.target.value)} className="input-base" placeholder="Ex.: Scanner intraoral, CBCT, venda" />
              </Field>

              <Field label={t('form.priority')} required>
                <select value={form.priority} onChange={e => update('priority', e.target.value)} className="input-base">
                  {['Baixa', 'Média', 'Alta', 'Crítica'].map(p => <option key={p} value={p}>{t(`priority.${p.toLowerCase()}`)}</option>)}
                </select>
              </Field>

              <Field label={t('form.objetivoDor')} required>
                <textarea value={form.justification} onChange={e => update('justification', e.target.value)} rows={4} className="input-base resize-none" placeholder={t('form.objetivoDorPlaceholder')} />
              </Field>

              <Field label={t('form.formatoDesejado')}>
                <select value={form.format} onChange={e => update('format', e.target.value)} className="input-base">
                  <option value="Remoto">{t('format.online_ao_vivo')}</option>
                  <option value="Presencial">{t('format.presencial')}</option>
                </select>
              </Field>

              <Field label={t('form.observacoes')}>
                <textarea value={form.format_details} onChange={e => update('format_details', e.target.value)} rows={3} className="input-base resize-none" placeholder={t('form.observacoesPlaceholder')} />
              </Field>
            </div>

            {/* Buttons */}
            <div className="mt-6 space-y-2.5">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#00A6D6]/20 transition-colors"
              >
                {t('form.gerarSolicitacao')}
              </button>
              <button
                onClick={handleClear}
                className="w-full py-2.5 text-sm font-semibold text-slate-600 bg-[#F0F4F8] rounded-full hover:bg-slate-200 transition-colors"
              >
                {t('form.limparFormulario')}
              </button>
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:sticky lg:top-4">
            <h3 className="text-base font-bold text-slate-900">{t('form.resumoPedido')}</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">{t('form.resumoHelper')}</p>
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 min-h-[200px] mb-3">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">
                {hasContent ? buildSummary() : t('form.resumoPlaceholder')}
              </pre>
            </div>
            <button
              onClick={handleCopy}
              disabled={!hasContent}
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#003B5C] rounded-full hover:bg-[#002D47] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('form.copied') : t('form.copiarResumo')}
            </button>
          </div>
        </div>
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