import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import RequestParticipants from '@/components/RequestParticipants';
import AccessDetailsEditor from '@/components/AccessDetailsEditor';
import { ArrowLeft, Check, X, Clock, MapPin, User, Mail, Building, Calendar, Star, Copy, FileText, Loader2, Globe, Activity } from 'lucide-react';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, tf, tv, lang } = useLanguage();
  const [req, setReq] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [educatorAnalysis, setEducatorAnalysis] = useState('');
  const [managerAnalysis, setManagerAnalysis] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [executionNotes, setExecutionNotes] = useState('');
  const [finalNotes, setFinalNotes] = useState('');
  const [trainingCompletedDate, setTrainingCompletedDate] = useState('');
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [generatingSurvey, setGeneratingSurvey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [r, surveys] = await Promise.all([
        base44.entities.TrainingRequest.get(id),
        base44.entities.SatisfactionSurvey.filter({ training_request_id: id }).catch(() => [])
      ]);
      setReq(r);
      setEducatorAnalysis(tf(r.educator_analysis) || '');
      setManagerAnalysis(tf(r.manager_analysis) || '');
      setRejectionReason(tf(r.rejection_reason) || '');
      setExecutionNotes(tf(r.execution_notes) || '');
      setFinalNotes(tf(r.final_notes) || '');
      setTrainingCompletedDate(r.training_completed_date || '');
      setLoading(false);

      if (surveys.length > 0) {
        setSurvey(surveys[0]);
        base44.entities.SurveyResponse.filter({ survey_id: surveys[0].id }).then(setResponses).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const userRole = user?.role || 'solicitante';

  const canReviewStage1 = userRole === 'educador' || userRole === 'admin';
  const canReviewStage2 = userRole === 'gerente_regional' || userRole === 'admin';
  const canEditExecution = userRole === 'educador' || userRole === 'admin';
  const canCloseCycle = userRole === 'gerente_regional' || userRole === 'admin';
  const canGenerateSurvey = userRole === 'educador' || userRole === 'admin';
  const canEditAccess = userRole === 'admin' || userRole === 'educador' || user?.email === req?.requester_email;

  const handleDecision = async (stage, decision) => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let updateData = {};

      if (stage === 1) {
        const texts = { analysis: educatorAnalysis };
        let translations = {};
        try {
          const resp = await base44.functions.invoke('translateContent', { texts, source_lang: lang });
          translations = resp.data.translations || {};
        } catch (e) {}

        updateData = {
          educator_analysis: translations.analysis || { [lang]: educatorAnalysis },
          educator_name: user?.full_name,
          educator_id: user?.id,
          decision_stage1: decision,
          date_stage1: today,
          status: decision === 'Aprovado' ? 'Aprovado Etapa 1' : 'Rejeitado'
        };
        if (decision === 'Rejeitado') {
          const rejTexts = { reason: rejectionReason };
          try {
            const rejResp = await base44.functions.invoke('translateContent', { texts: rejTexts, source_lang: lang });
            updateData.rejection_reason = rejResp.data.translations?.reason || { [lang]: rejectionReason };
          } catch (e) {
            updateData.rejection_reason = { [lang]: rejectionReason };
          }
        }
      } else if (stage === 2) {
        const texts = { analysis: managerAnalysis };
        let translations = {};
        try {
          const resp = await base44.functions.invoke('translateContent', { texts, source_lang: lang });
          translations = resp.data.translations || {};
        } catch (e) {}

        updateData = {
          manager_analysis: translations.analysis || { [lang]: managerAnalysis },
          decision_stage2: decision,
          date_stage2: today,
          status: decision === 'Aprovado' ? 'Aprovado Etapa 2' : 'Rejeitado'
        };
        if (decision === 'Rejeitado') {
          const rejTexts = { reason: rejectionReason };
          try {
            const rejResp = await base44.functions.invoke('translateContent', { texts: rejTexts, source_lang: lang });
            updateData.rejection_reason = rejResp.data.translations?.reason || { [lang]: rejectionReason };
          } catch (e) {
            updateData.rejection_reason = { [lang]: rejectionReason };
          }
        }
      }

      await base44.entities.TrainingRequest.update(id, updateData);
      await loadData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTraining = async () => {
    setSaving(true);
    try {
      const texts = { notes: executionNotes };
      let translations = {};
      try {
        const resp = await base44.functions.invoke('translateContent', { texts, source_lang: lang });
        translations = resp.data.translations || {};
      } catch (e) {}

      await base44.entities.TrainingRequest.update(id, {
        training_completed_date: trainingCompletedDate || new Date().toISOString().split('T')[0],
        execution_notes: translations.notes || { [lang]: executionNotes },
        status: 'Concluído'
      });
      await loadData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCycle = async () => {
    setSaving(true);
    try {
      const texts = { notes: finalNotes };
      let translations = {};
      try {
        const resp = await base44.functions.invoke('translateContent', { texts, source_lang: lang });
        translations = resp.data.translations || {};
      } catch (e) {}

      await base44.entities.TrainingRequest.update(id, {
        final_notes: translations.notes || { [lang]: finalNotes },
        status: 'Concluído'
      });
      await loadData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSurvey = async () => {
    setGeneratingSurvey(true);
    try {
      const resp = await base44.functions.invoke('generateSurvey', {
        request_type: req.request_type,
        product_name: req.product_name,
        training_focus: req.training_focus,
        training_request_id: id,
        request_id_display: req.request_id
      });
      setSurvey(resp.data.survey);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGeneratingSurvey(false);
    }
  };

  const copySurveyLink = () => {
    const url = `https://trainning.alliage.global/survey/${survey?.public_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">{t('common.noResults')}</p>
        <button onClick={() => navigate('/requests')} className="mt-3 text-[#00A6D6] hover:underline">{t('nav.requests')}</button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/requests')} className="p-2 text-slate-400 hover:text-[#003B5C] hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#003B5C]">{req.request_id}</h1>
            <StatusBadge status={req.status} t={t} />
            <PriorityBadge priority={req.priority} t={t} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{t('detail.created')}: {req.created_date?.split('T')[0]}</p>
        </div>
      </div>

      <Section title={t('detail.identification')} icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label={t('form.requesterName')} value={req.requester_name} icon={User} />
          <InfoRow label={t('form.requesterEmail')} value={req.requester_email} icon={Mail} />
          <InfoRow label={t('form.region')} value={t(`region.${(req.region || '').toLowerCase()}`)} icon={MapPin} />
          <InfoRow label={t('form.companyType')} value={tv(req.company_type)} icon={Building} />
          <InfoRow label={t('form.position')} value={req.position} />
          <InfoRow label={t('form.area')} value={tv(req.area)} />
        </div>
      </Section>

      <Section title={t('detail.trainingDetails')} icon={FileText}>
        <div className="space-y-3">
          <InfoRow label={t('form.requestType')} value={tv(req.request_type)} />
          {Array.isArray(req.products) && req.products.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('form.productsLabel')}</p>
              <div className="flex flex-wrap gap-1">
                {req.products.map((p, i) => {
                  const brand = p.brand === 'Outro' ? (p.brand_detail || '') : p.brand;
                  return <span key={i} className="tag-cyan">{brand ? `${p.category} — ${brand}` : p.category}</span>;
                })}
              </div>
            </div>
          ) : (
            <>
              <InfoRow label={t('form.productCategory')} value={req.product_category} />
              <InfoRow label={t('form.productName')} value={req.product_name} />
            </>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('form.trainingFocus')}
            </p>
            <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.training_focus)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('form.audience')}</p>
              <div className="flex flex-wrap gap-1">
                {(req.audience || []).map(a => <span key={a} className="tag-cyan">{tv(a)}</span>)}
              </div>
            </div>
            <InfoRow label={t('form.participantsCount')} value={req.participants_count} />
          </div>
        </div>
      </Section>

      <Section title={t('detail.justification')} icon={Star}>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('form.justification')}
            </p>
            <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.justification)}</p>
          </div>
          {(req.specific_problems || []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('form.specificProblems')}</p>
              <div className="flex flex-wrap gap-1">
                {req.specific_problems.map(p => <span key={p} className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">{tv(p)}</span>)}
              </div>
            </div>
          )}
          {(req.expected_impacts || []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('form.expectedImpacts')}</p>
              <div className="flex flex-wrap gap-1">
                {req.expected_impacts.map(p => <span key={p} className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">{tv(p)}</span>)}
              </div>
            </div>
          )}
          {tf(req.consequence_60_days) && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('form.consequence60')}
              </p>
              <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.consequence_60_days)}</p>
            </div>
          )}
        </div>
      </Section>

      <Section title={t('detail.urgency')} icon={Calendar}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label={t('form.deadlineRequested')} value={req.deadline_requested?.split('T')[0]} icon={Calendar} />
          <InfoRow label={t('form.format')} value={t(`format.${(req.format || 'remoto').toLowerCase()}`)} />
        </div>
        {tf(req.deadline_reason) && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('form.deadlineReason')}
            </p>
            <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.deadline_reason)}</p>
          </div>
        )}
        {req.format === 'Presencial' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <InfoRow label={t('form.locationCountry')} value={req.location_country} />
            <InfoRow label={t('form.locationCity')} value={req.location_city} />
            <InfoRow label={t('form.locationSpecific')} value={req.location_specific} />
          </div>
        )}
      </Section>

      <AccessDetailsEditor request={req} canEdit={canEditAccess} onUpdated={loadData} />

      {req.has_multiplier && (req.specialist_name || req.specialist_role) && (
        <Section title={t('detail.specialist')} icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoRow label={t('form.specialistName')} value={req.specialist_name} />
            <InfoRow label={t('form.specialistRole')} value={req.specialist_role} />
            <InfoRow label={t('form.specialistEmail')} value={req.specialist_email} icon={Mail} />
          </div>
        </Section>
      )}

      {/* Workflow - Stage 1 */}
      <Section title={t('detail.stage1')} icon={Clock}>
        <div className="space-y-3">
          {tf(req.educator_analysis) && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {t('detail.educatorAnalysis')}
              </p>
              <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.educator_analysis)}</p>
            </div>
          )}
          {req.date_stage1 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">{t('detail.decision')}:</span>
              <span className={`font-medium ${req.decision_stage1 === 'Aprovado' ? 'text-green-600' : req.decision_stage1 === 'Rejeitado' ? 'text-red-600' : 'text-slate-400'}`}>
                {tv(req.decision_stage1)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{t('detail.date')}: {req.date_stage1?.split('T')[0]}</span>
            </div>
          )}

          {canReviewStage1 && req.decision_stage1 === 'Pendente' && (
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.educatorAnalysis')}</label>
                <textarea value={educatorAnalysis} onChange={e => setEducatorAnalysis(e.target.value)} rows={3} className="input-base resize-none" placeholder={t('detail.educatorAnalysisPlaceholder')} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDecision(1, 'Aprovado')} disabled={saving || !educatorAnalysis} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-full hover:bg-emerald-600 disabled:opacity-40 transition-colors shadow-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t('common.approve')}
                </button>
                <button onClick={() => handleDecision(1, 'Rejeitado')} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 disabled:opacity-40 transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                  {t('common.reject')}
                </button>
              </div>
              {educatorAnalysis && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.rejectionReason')} ({t('common.optional')})</label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} className="input-base resize-none" placeholder={t('detail.rejectionReasonPlaceholder')} />
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Workflow - Stage 2 */}
      {req.decision_stage1 === 'Aprovado' && (
        <Section title={t('detail.stage2')} icon={Clock}>
          <div className="space-y-3">
            {tf(req.manager_analysis) && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {t('detail.managerAnalysis')}
                </p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.manager_analysis)}</p>
              </div>
            )}
            {req.date_stage2 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">{t('detail.decision')}:</span>
                <span className={`font-medium ${req.decision_stage2 === 'Aprovado' ? 'text-green-600' : req.decision_stage2 === 'Rejeitado' ? 'text-red-600' : 'text-slate-400'}`}>
                  {tv(req.decision_stage2)}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{t('detail.date')}: {req.date_stage2?.split('T')[0]}</span>
              </div>
            )}

            {canReviewStage2 && req.decision_stage2 === 'Pendente' && (
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.managerAnalysis')}</label>
                  <textarea value={managerAnalysis} onChange={e => setManagerAnalysis(e.target.value)} rows={3} className="input-base resize-none" placeholder={t('detail.managerAnalysisPlaceholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.rejectionReason')} ({t('common.optional')})</label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} className="input-base resize-none" placeholder={t('detail.rejectionReasonPlaceholder')} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDecision(2, 'Aprovado')} disabled={saving || !managerAnalysis} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-full hover:bg-emerald-600 disabled:opacity-40 transition-colors shadow-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t('common.approve')}
                  </button>
                  <button onClick={() => handleDecision(2, 'Rejeitado')} disabled={saving || !rejectionReason} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 disabled:opacity-40 transition-colors shadow-sm">
                    <X className="w-4 h-4" />
                    {t('common.reject')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {req.status === 'Rejeitado' && tf(req.rejection_reason) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Globe className="w-3 h-3" /> {t('detail.rejectionReason')}
          </p>
          <p className="text-sm text-red-800">{tf(req.rejection_reason)}</p>
        </div>
      )}

      {req.decision_stage2 === 'Aprovado' && (
        <Section title={t('detail.execution')} icon={Check}>
          <div className="space-y-3">
            {req.training_scheduled_date && (
              <InfoRow label={t('detail.trainingScheduledDate')} value={req.training_scheduled_date?.split('T')[0]} icon={Calendar} />
            )}
            {req.training_completed_date && (
              <InfoRow label={t('detail.trainingCompletedDate')} value={req.training_completed_date?.split('T')[0]} icon={Calendar} />
            )}
            {tf(req.execution_notes) && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {t('detail.executionNotes')}
                </p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.execution_notes)}</p>
              </div>
            )}
            {tf(req.final_notes) && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {t('detail.finalNotes')}
                </p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-xl p-3">{tf(req.final_notes)}</p>
              </div>
            )}

            {canEditExecution && !req.training_completed_date && (
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.trainingCompletedDate')}</label>
                  <input type="date" value={trainingCompletedDate} onChange={e => setTrainingCompletedDate(e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.executionNotes')}</label>
                  <textarea value={executionNotes} onChange={e => setExecutionNotes(e.target.value)} rows={3} className="input-base resize-none" placeholder={t('detail.executionNotesPlaceholder')} />
                </div>
                <button onClick={handleCompleteTraining} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-full hover:bg-emerald-600 disabled:opacity-40 transition-colors shadow-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t('detail.completeTraining')}
                </button>
              </div>
            )}

            {canCloseCycle && req.training_completed_date && !tf(req.final_notes) && req.status !== 'Concluído' && (
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t('detail.finalNotes')}</label>
                  <textarea value={finalNotes} onChange={e => setFinalNotes(e.target.value)} rows={3} className="input-base resize-none" placeholder={t('detail.finalNotesPlaceholder')} />
                </div>
                <button onClick={handleCloseCycle} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] disabled:opacity-40 transition-colors shadow-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t('detail.closeCycle')}
                </button>
              </div>
            )}
          </div>
        </Section>
      )}

      <RequestParticipants request={req} onUpdated={loadData} />

      {req.decision_stage2 === 'Aprovado' && canGenerateSurvey && (
        <Section title={t('detail.survey')} icon={Star}>
          <div className="space-y-3">
            {!survey ? (
              <button onClick={handleGenerateSurvey} disabled={generatingSurvey} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#003B5C] rounded-full hover:bg-[#002D47] disabled:opacity-40 transition-colors shadow-sm">
                {generatingSurvey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                {t('detail.generateSurvey')}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                  <input readOnly value={`https://trainning.alliage.global/survey/${survey.public_token}`} className="flex-1 bg-transparent text-sm text-slate-600 outline-none cursor-default" />
                  <button onClick={copySurveyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? '✓' : t('detail.copyLink')}
                  </button>
                  <a href={`/survey/${survey.public_token}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#003B5C] rounded-full hover:bg-[#002D47] transition-colors">
                    <Globe className="w-3.5 h-3.5" />
                    Abrir
                  </a>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">{t('detail.surveyResponses')}:</span>
                  <span className="font-semibold text-slate-800">{responses.length} {t('detail.responseCount')}</span>
                  {responses.length > 0 && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">{t('detail.avgRating')}:</span>
                      <span className="font-semibold text-slate-800">
                        {(responses.reduce((sum, r) => sum + (r.rating_overall || 0), 0) / responses.filter(r => r.rating_overall).length || 0).toFixed(1)} / 5.0
                      </span>
                    </>
                  )}
                </div>
                {responses.length > 0 && (
                  <div className="space-y-2">
                    {responses.map((resp, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{resp.respondent_name || `#${i + 1}`}</span>
                          {resp.rating_overall && (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} className={`w-3.5 h-3.5 ${n <= resp.rating_overall ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card-modern p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <div className="w-7 h-7 rounded-lg bg-[#00A6D6]/10 flex items-center justify-center"><Icon className="w-4 h-4 text-[#00A6D6]" /></div>}
        <h2 className="text-sm font-semibold text-[#003B5C]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}