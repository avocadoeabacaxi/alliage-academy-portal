import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Search, Loader2, BarChart3, TrendingUp, Users, FileText, Send, CheckCircle2, X, Mail, Clock } from 'lucide-react';

export default function Surveys() {
  const { t, lang } = useLanguage();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEducator, setFilterEducator] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [educators, setEducators] = useState([]);
  const [resending, setResending] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const evals = await base44.entities.TrainingEvaluation.list('-created_date', 100);
      setEvaluations(evals);
      const uniqueEducators = [...new Set(evals.map(e => e.educator_name))];
      setEducators(uniqueEducators);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResendSurvey = async (eval_) => {
    setResending(eval_.id);
    try {
      await base44.functions.invoke('resendSurveyEmail', {
        training_request_id: eval_.training_request_id,
        request_id_display: eval_.request_id_display,
        public_token: eval_.public_token
      });
      await loadData();
      const updated = (await base44.entities.TrainingEvaluation.filter({ id: eval_.id }))[0] || eval_;
      setSuccessModal({
        evaluation: updated,
        product_name: eval_.product_name,
        request_id_display: eval_.request_id_display
      });
    } catch (e) {
      alert('Erro ao reenviar: ' + e.message);
    } finally {
      setResending(null);
    }
  };

  const filteredEvals = evaluations.filter(e => {
    if (search && !e.product_name.toLowerCase().includes(search.toLowerCase()) && 
        !e.request_id_display.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEducator && e.educator_name !== filterEducator) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: evaluations.length,
    completed: evaluations.filter(e => e.status === 'completed').length,
    avgNPS: evaluations.filter(e => e.nps_score).length > 0
      ? Math.round(evaluations.filter(e => e.nps_score).reduce((s, e) => s + e.nps_score, 0) / evaluations.filter(e => e.nps_score).length)
      : 0,
    avgOverall: evaluations.filter(e => e.overall_rating).length > 0
      ? (evaluations.filter(e => e.overall_rating).reduce((s, e) => s + e.overall_rating, 0) / evaluations.filter(e => e.overall_rating).length).toFixed(1)
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003B5C] mb-1">Pesquisas de Avaliação</h1>
        <p className="text-sm text-slate-500">Avaliações automáticas de treinamentos realizados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card-modern p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-[#003B5C]">{stats.total}</p>
        </div>
        <div className="card-modern p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Concluídas</span>
            <BarChart3 className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="card-modern p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">NPS Médio</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.avgNPS}</p>
        </div>
        <div className="card-modern p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Avaliação Geral</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.avgOverall}/5</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por produto ou ID..."
            className="input-base pl-9"
          />
        </div>
        <select
          value={filterEducator}
          onChange={e => setFilterEducator(e.target.value)}
          className="input-base lg:w-48"
        >
          <option value="">Todos os Educadores</option>
          {educators.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-base lg:w-48"
        >
          <option value="">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="sent">Enviada</option>
          <option value="in_progress">Em Progresso</option>
          <option value="completed">Concluída</option>
        </select>
      </div>

      {/* Results Table */}
      <div className="card-modern overflow-hidden">
        {filteredEvals.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">Nenhuma avaliação encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Produto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Educador</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">NPS</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Avaliação</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Data</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Reenvios</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvals.map(e => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{e.request_id_display}</td>
                    <td className="px-4 py-3 text-slate-700">{e.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.educator_name}</td>
                    <td className="px-4 py-3 text-center">
                      {e.nps_score ? (
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${e.nps_score >= 8 ? 'bg-green-50 text-green-700' : e.nps_score >= 6 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                          {e.nps_score}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.overall_rating ? (
                        <span className="font-semibold text-slate-900">{e.overall_rating}/5</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                        e.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        e.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        e.status === 'sent' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {e.status === 'completed' ? 'Concluída' : 
                         e.status === 'in_progress' ? 'Em Progresso' :
                         e.status === 'sent' ? 'Enviada' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {e.submitted_at ? new Date(e.submitted_at).toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.resend_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[#00A6D6]/10 text-[#00A6D6]">
                          <Send className="w-3 h-3" />
                          {e.resend_count}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleResendSurvey(e)}
                        disabled={resending === e.id || e.status === 'completed'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#00A6D6] border border-[#00A6D6]/30 hover:bg-[#00A6D6]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resending === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {resending === e.id ? 'Enviando...' : 'Reenviar'}
                        {e.resend_count > 0 && !resending && (
                          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#00A6D6]/15 text-[#00A6D6] text-[10px] font-bold leading-none">
                            {e.resend_count}
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSuccessModal(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSuccessModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success icon */}
            <div className="pt-8 pb-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-[#003B5C] mb-1">Email Reenviado!</h2>
              <p className="text-sm text-slate-500">A pesquisa foi enviada com sucesso para o solicitante.</p>
            </div>

            {/* Details */}
            <div className="px-6 pb-6 space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-[#00A6D6] flex-shrink-0" />
                  <span className="text-slate-500">Produto:</span>
                  <span className="font-medium text-slate-900 truncate">{successModal.product_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-[#00A6D6] flex-shrink-0" />
                  <span className="text-slate-500">Solicitação:</span>
                  <span className="font-medium text-slate-900">{successModal.request_id_display}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Send className="w-4 h-4 text-[#00A6D6] flex-shrink-0" />
                  <span className="text-slate-500">Total de reenvios:</span>
                  <span className="font-bold text-[#00A6D6]">{successModal.evaluation?.resend_count || 1}</span>
                </div>
                {successModal.evaluation?.last_resent_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-[#00A6D6] flex-shrink-0" />
                    <span className="text-slate-500">Enviado em:</span>
                    <span className="font-medium text-slate-900">
                      {new Date(successModal.evaluation.last_resent_at).toLocaleString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US')}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSuccessModal(null)}
                className="w-full py-2.5 rounded-full bg-[#00A6D6] text-white text-sm font-semibold hover:bg-[#0094BD] transition-colors shadow-md shadow-[#00A6D6]/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}