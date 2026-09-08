import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { alliage } from '@/api/alliageClient';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { StatusBadge } from '@/components/StatusBadge';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Clock, CheckCircle2, FileText, PlusCircle, Download, Activity } from 'lucide-react';
import TrainersTab from '@/components/dashboard/TrainersTab';
import { requestKind, requestTypeLabels } from '@/lib/requestTypeLabels';

const STATUS_COLORS = {
  'Pendente Análise': '#F59E0B',
  'Aprovado Etapa 1': '#00A6D6',
  'Aprovado Etapa 2': '#10B981',
  'Concluído': '#059669',
  'Rejeitado': '#EF4444'
};

const REGION_COLORS = {
  'Brasil': '#003B5C',
  'LATAM': '#00A6D6',
  'USA': '#10B981',
  'ROW': '#8B5CF6'
};

const STATUS_KEYS = {
  'Pendente Análise': 'pendente',
  'Aprovado Etapa 1': 'aprovado1',
  'Aprovado Etapa 2': 'aprovado2',
  'Concluído': 'concluido',
  'Rejeitado': 'rejeitado'
};

export default function Dashboard() {
  const { t, tf, lang } = useLanguage();
  const typeLabels = requestTypeLabels(lang);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({ region: '', status: '', priority: '' });
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await alliage.auth.me();
        const authorization = await alliage.functions.invoke('checkUserAuthorization', { email: currentUser.email });
        const appUser = authorization.data?.status === 'approved' && authorization.data?.role
          ? { ...currentUser, role: authorization.data.role, region: authorization.data.region || currentUser.region }
          : currentUser;
        setUser(appUser);
        if (appUser.role === 'solicitante') {
          navigate('/my-requests', { replace: true });
          return;
        }
        const requests = await alliage.entities.TrainingRequest.list('-created_date', 1000);
        const visibleRequests = appUser.role === 'gerente_regional' && appUser.region
          ? requests.filter((request) => request.region === appUser.region)
          : requests;
        setRequests(visibleRequests);
        if (appUser.role === 'gerente_regional' && appUser.region) setFilters((current) => ({ ...current, region: appUser.region }));
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filters.region && r.region !== filters.region) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      return true;
    });
  }, [requests, filters]);

  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const pending = filteredRequests.filter(r => r.status === 'Pendente Análise').length;
    const approved = filteredRequests.filter(r => r.status === 'Aprovado Etapa 1' || r.status === 'Aprovado Etapa 2').length;
    const completed = filteredRequests.filter(r => r.status === 'Concluído').length;
    const rejected = filteredRequests.filter(r => r.status === 'Rejeitado').length;
    const approvalRate = total > 0 ? Math.round(((approved + completed) / total) * 100) : 0;

    const analysisTimes = filteredRequests
      .filter(r => r.date_stage1 && r.created_date)
      .map(r => {
        const created = new Date(r.created_date);
        const stage1 = new Date(r.date_stage1);
        return Math.round((stage1 - created) / (1000 * 60 * 60 * 24));
      })
      .filter(d => d >= 0);
    const avgTime = analysisTimes.length > 0 ? Math.round(analysisTimes.reduce((a, b) => a + b, 0) / analysisTimes.length) : 0;

    return { total, pending, approved, completed, rejected, approvalRate, avgTime };
  }, [filteredRequests]);

  const byStatusData = useMemo(() => {
    const counts = {};
    filteredRequests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: t(`status.${STATUS_KEYS[name]}`), value, color: STATUS_COLORS[name] }));
  }, [filteredRequests, t]);

  const byRegionData = useMemo(() => {
    const counts = {};
    filteredRequests.forEach(r => { counts[r.region] = (counts[r.region] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: REGION_COLORS[name] }));
  }, [filteredRequests]);

  const byProductData = useMemo(() => {
    const counts = {};
    filteredRequests.forEach(r => {
      const p = r.product_name || '—';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredRequests]);

  const byTypeData = useMemo(() => {
    const counts = {};
    filteredRequests.forEach((request) => {
      const kind = requestKind(request);
      const name = typeLabels[kind];
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRequests, typeLabels]);

  const handleExport = () => {
    const headers = ['ID', 'Status', 'Priority', 'Region', 'Product', 'Type', 'Requester', 'Created'];
    const rows = filteredRequests.map(r => [r.request_id, r.status, r.priority, r.region, r.product_name, r.request_type, r.requester_name, r.created_date?.split('T')[0]]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training_requests.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003B5C]">{t('dash.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('dash.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#003B5C] bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <Link to="/requests/new" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] shadow-md shadow-[#00A6D6]/20 transition-colors">
            <PlusCircle className="w-4 h-4" />
            {t('nav.newRequest')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button onClick={() => setActiveTab('general')} className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${activeTab === 'general' ? 'border-[#00A6D6] text-[#003B5C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          {t('dash.tab.general')}
        </button>
        <button onClick={() => setActiveTab('trainers')} className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${activeTab === 'trainers' ? 'border-[#00A6D6] text-[#003B5C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          {t('dash.tab.trainers')}
        </button>
      </div>

      {activeTab === 'general' && (
      <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {user?.role !== 'gerente_regional' && (
          <select value={filters.region} onChange={e => setFilters({...filters, region: e.target.value})} className="input-base w-auto">
            <option value="">{t('dash.allRegions')}</option>
            {['Brasil', 'LATAM', 'USA', 'ROW'].map(r => <option key={r} value={r}>{t(`region.${r.toLowerCase()}`)}</option>)}
          </select>
        )}
        <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="input-base w-auto">
          <option value="">{t('dash.allStatuses')}</option>
          {['Pendente Análise', 'Aprovado Etapa 1', 'Aprovado Etapa 2', 'Concluído', 'Rejeitado'].map(s => <option key={s} value={s}>{t(`status.${STATUS_KEYS[s]}`)}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})} className="input-base w-auto">
          <option value="">{t('dash.allPriorities')}</option>
          {['Baixa', 'Média', 'Alta', 'Crítica'].map(p => <option key={p} value={p}>{t(`priority.${p.toLowerCase()}`)}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={FileText} label={t('dash.totalRequests')} value={stats.total} color="navy" />
        <KpiCard icon={Clock} label={t('dash.pendingAnalysis')} value={stats.pending} color="amber" />
        <KpiCard icon={TrendingUp} label={t('dash.approvalRate')} value={`${stats.approvalRate}%`} color="cyan" />
        <KpiCard icon={CheckCircle2} label={t('dash.completed')} value={stats.completed} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title={t('dash.byStatus')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                {byStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 12px 32px rgba(0,59,92,0.08)' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dash.byRegion')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byRegionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 12px 32px rgba(0,59,92,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {byRegionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title={t('dash.byProduct')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byProductData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 12px 32px rgba(0,59,92,0.08)' }} />
              <Bar dataKey="value" fill="#003B5C" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dash.byType')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byTypeData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 12px 32px rgba(0,59,92,0.08)' }} />
              <Bar dataKey="value" fill="#00A6D6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Region Map */}
      <ChartCard title={t('dash.map')}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {['Brasil', 'LATAM', 'USA', 'ROW'].map(region => {
            const count = filteredRequests.filter(r => r.region === region).length;
            return (
              <div key={region} className="relative rounded-2xl p-4 border border-slate-200/80" style={{ backgroundColor: REGION_COLORS[region] + '0D' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[region] }} />
                  <span className="text-sm font-semibold text-slate-700">{t(`region.${region.toLowerCase()}`)}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: REGION_COLORS[region] }}>{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t('dash.totalRequests')}</p>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Recent Activity */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-[#003B5C] mb-3">{t('dash.recentActivity')}</h2>
        <div className="card-modern overflow-hidden">
          {filteredRequests.slice(0, 5).map(r => (
            <Link key={r.id} to={`/requests/${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#00A6D6]/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-[#00A6D6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.request_id} — {tf(r.training_focus) || r.product_name}</p>
                  <p className="text-xs text-slate-500">{r.requester_name} · {t(`region.${(r.region || '').toLowerCase()}`)}</p>
                </div>
              </div>
              <StatusBadge status={r.status} t={t} />
            </Link>
          ))}
          {filteredRequests.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">{t('common.noResults')}</div>
          )}
        </div>
      </div>
      </>
      )}
      {activeTab === 'trainers' && <TrainersTab requests={requests} />}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    navy: 'bg-[#003B5C]/8 text-[#003B5C]',
    cyan: 'bg-[#00A6D6]/10 text-[#00A6D6]',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className="card-modern p-4 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card-modern p-4">
      <h3 className="text-sm font-semibold text-[#003B5C] mb-3">{title}</h3>
      {children}
    </div>
  );
}