import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Search, Filter, Loader2, BarChart3, TrendingUp, Users, FileText } from 'lucide-react';

export default function Surveys() {
  const { t, lang } = useLanguage();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEducator, setFilterEducator] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [educators, setEducators] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const evals = await base44.entities.TrainingEvaluation.list('-created_date', 100);
      setEvaluations(evals);

      // Extract unique educators
      const uniqueEducators = [...new Set(evals.map(e => e.educator_name))];
      setEducators(uniqueEducators);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}