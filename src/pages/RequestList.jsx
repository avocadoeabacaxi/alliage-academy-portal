import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Search, PlusCircle, FileText } from 'lucide-react';

export default function RequestList() {
  const { t, tf } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', region: '', priority: '' });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.TrainingRequest.list('-created_date', 500)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = requests;

    // Role-based filtering
    if (user?.role === 'solicitante') {
      result = result.filter(r => r.requester_email === user.email || r.created_by_id === user.id);
    } else if (user?.role === 'gerente_regional' && user.region) {
      result = result.filter(r => r.region === user.region);
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        (r.request_id || '').toLowerCase().includes(s) ||
        (r.product_name || '').toLowerCase().includes(s) ||
        (r.requester_name || '').toLowerCase().includes(s) ||
        (tf(r.training_focus) || '').toLowerCase().includes(s)
      );
    }

    // Filters
    if (filters.status) result = result.filter(r => r.status === filters.status);
    if (filters.region) result = result.filter(r => r.region === filters.region);
    if (filters.priority) result = result.filter(r => r.priority === filters.priority);

    return result;
  }, [requests, user, search, filters, tf]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('list.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} {t('nav.requests').toLowerCase()}</p>
        </div>
        <Link to="/requests/new" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <PlusCircle className="w-4 h-4" />
          {t('list.newRequest')}
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('list.searchPlaceholder')}
            className="input-base pl-9"
          />
        </div>
        <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="input-base w-auto">
          <option value="">{t('dash.allStatuses')}</option>
          {['Pendente Análise', 'Aprovado Etapa 1', 'Aprovado Etapa 2', 'Concluído', 'Rejeitado'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.region} onChange={e => setFilters({...filters, region: e.target.value})} className="input-base w-auto">
          <option value="">{t('dash.allRegions')}</option>
          {['Brasil', 'LATAM', 'USA', 'ROW'].map(r => <option key={r} value={r}>{t(`region.${r.toLowerCase()}`)}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})} className="input-base w-auto">
          <option value="">{t('dash.allPriorities')}</option>
          {['Baixa', 'Média', 'Alta', 'Crítica'].map(p => <option key={p} value={p}>{t(`priority.${p.toLowerCase()}`)}</option>)}
        </select>
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('list.requestId')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('list.product')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('list.requester')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('list.region')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('list.priority')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('list.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/requests/${r.id}`}>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-blue-600">{r.request_id}</span>
                  <p className="text-xs text-slate-400">{r.created_date?.split('T')[0]}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{r.product_name}</p>
                  <p className="text-xs text-slate-400">{r.request_type}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{r.requester_name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{t(`region.${(r.region || '').toLowerCase()}`)}</td>
                <td className="px-4 py-3"><PriorityBadge priority={r.priority} t={t} /></td>
                <td className="px-4 py-3"><StatusBadge status={r.status} t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-2">
        {filtered.map(r => (
          <Link key={r.id} to={`/requests/${r.id}`} className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-600">{r.request_id}</span>
              <StatusBadge status={r.status} t={t} />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">{r.product_name}</p>
            <p className="text-xs text-slate-500">{r.requester_name} · {t(`region.${(r.region || '').toLowerCase()}`)} · <PriorityBadge priority={r.priority} t={t} /></p>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">{t('list.empty')}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('list.emptyDesc')}</p>
        </div>
      )}
    </div>
  );
}