import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { alliage } from '@/api/alliageClient';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { StatusBadge } from '@/components/StatusBadge';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, CheckCircle2, Star, Clock, BarChart3 } from 'lucide-react';

const REGION_COLORS = {
  'Brasil': '#003B5C',
  'LATAM': '#00A6D6',
  'USA': '#10B981',
  'ROW': '#8B5CF6'
};

export default function TrainersTab({ requests }) {
  const { t } = useLanguage();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  useEffect(() => {
    alliage.entities.SurveyResponse.list('-created_date', 1000)
      .then(setResponses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { trainers, unassigned } = useMemo(() => {
    const grouped = {};
    let unassigned = 0;
    requests.forEach(r => {
      if (!r.educator_name) {
        unassigned++;
        return;
      }
      const name = r.educator_name;
      if (!grouped[name]) {
        grouped[name] = {
          name, total: 0, approved: 0, rejected: 0, completed: 0, pending: 0,
          regions: {}, types: {}, reqList: []
        };
      }
      const g = grouped[name];
      g.total++;
      g.reqList.push(r);
      if (r.status === 'Concluído') g.completed++;
      else if (r.decision_stage1 === 'Aprovado') g.approved++;
      else if (r.decision_stage1 === 'Rejeitado') g.rejected++;
      else g.pending++;
      g.regions[r.region] = (g.regions[r.region] || 0) + 1;
      g.types[r.request_type] = (g.types[r.request_type] || 0) + 1;
    });
    return { trainers: Object.values(grouped).sort((a, b) => b.total - a.total), unassigned };
  }, [requests]);

  const trainerRatings = useMemo(() => {
    const ratings = {};
    responses.forEach(resp => {
      if (!resp.rating_overall) return;
      const req = requests.find(r => r.id === resp.training_request_id);
      if (!req || !req.educator_name) return;
      if (!ratings[req.educator_name]) ratings[req.educator_name] = [];
      ratings[req.educator_name].push(resp.rating_overall);
    });
    const result = {};
    Object.keys(ratings).forEach(name => {
      const arr = ratings[name];
      result[name] = arr.reduce((a, b) => a + b, 0) / arr.length;
    });
    return result;
  }, [responses, requests]);

  const chartData = useMemo(() => {
    return trainers.map(td => ({
      name: td.name.split(' ')[0],
      Concluído: td.completed,
      Aprovado: td.approved,
      Pendente: td.pending,
      Rejeitado: td.rejected
    }));
  }, [trainers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  if (trainers.length === 0) {
    return (
      <div className="card-modern p-8 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{t('dash.noTrainerData')}</p>
      </div>
    );
  }

  const selected = selectedTrainer ? trainers.find(td => td.name === selectedTrainer) : null;

  return (
    <div className="space-y-4">
      {/* Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Users} label={t('dash.totalTrainers')} value={trainers.length} color="navy" />
        <KpiCard icon={BarChart3} label={t('dash.totalCourses')} value={requests.filter(r => r.educator_name).length} color="cyan" />
        <KpiCard icon={CheckCircle2} label={t('dash.trainerCompleted')} value={trainers.reduce((s, td) => s + td.completed, 0)} color="green" />
        <KpiCard icon={Clock} label={t('dash.unassigned')} value={unassigned} color="amber" />
      </div>

      {/* Bar Chart */}
      <div className="card-modern p-4">
        <h3 className="text-sm font-semibold text-[#003B5C] mb-3">{t('dash.byTrainer')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 12px 32px rgba(0,59,92,0.08)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Concluído" stackId="a" fill="#059669" />
            <Bar dataKey="Aprovado" stackId="a" fill="#00A6D6" />
            <Bar dataKey="Pendente" stackId="a" fill="#F59E0B" />
            <Bar dataKey="Rejeitado" stackId="a" fill="#EF4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trainer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {trainers.map(td => (
          <TrainerCard
            key={td.name}
            trainer={td}
            rating={trainerRatings[td.name]}
            t={t}
            selected={selectedTrainer === td.name}
            onClick={() => setSelectedTrainer(selectedTrainer === td.name ? null : td.name)}
          />
        ))}
      </div>

      {/* Selected Trainer Detail */}
      {selected && (
        <TrainerDetail trainer={selected} rating={trainerRatings[selected.name]} t={t} />
      )}
    </div>
  );
}

function TrainerCard({ trainer, rating, t, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`card-modern p-4 text-left transition-all hover:shadow-card-hover ${selected ? 'ring-2 ring-[#00A6D6]' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A6D6] to-[#0088B0] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {trainer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{trainer.name}</p>
          <p className="text-xs text-slate-500">{trainer.total} {t('dash.trainerCourses')}</p>
        </div>
        {rating && (
          <div className="flex items-center gap-0.5 text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="text-xs font-bold">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat value={trainer.completed} label={t('dash.trainerCompletedShort')} color="text-green-600" />
        <Stat value={trainer.approved} label={t('dash.trainerApprovedShort')} color="text-[#00A6D6]" />
        <Stat value={trainer.pending} label={t('dash.trainerPendingShort')} color="text-amber-500" />
        <Stat value={trainer.rejected} label={t('dash.trainerRejectedShort')} color="text-red-500" />
      </div>
    </button>
  );
}

function Stat({ value, label, color }) {
  return (
    <div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 truncate">{label}</p>
    </div>
  );
}

function TrainerDetail({ trainer, rating, t }) {
  const regionData = useMemo(() => {
    return Object.entries(trainer.regions).map(([name, value]) => ({ name, value, color: REGION_COLORS[name] }));
  }, [trainer]);

  const typeData = useMemo(() => {
    return Object.entries(trainer.types)
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value }))
      .sort((a, b) => b.value - a.value);
  }, [trainer]);

  return (
    <div className="card-modern p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003B5C] to-[#002D47] flex items-center justify-center text-sm font-bold text-white">
          {trainer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-[#003B5C]">{trainer.name}</h3>
          <p className="text-xs text-slate-500">
            {trainer.total} {t('dash.trainerCourses')} · {t('dash.avgRating')}: {rating ? `${rating.toFixed(1)} / 5.0` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('dash.byRegion')}</h4>
          {regionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {regionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('dash.byType')}</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Bar dataKey="value" fill="#00A6D6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('dash.trainerRequests')}</h4>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {trainer.reqList.map(r => (
            <Link key={r.id} to={`/requests/${r.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="text-sm text-slate-700 truncate">{r.request_id} — {r.product_name}</span>
              <StatusBadge status={r.status} t={t} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    navy: 'bg-[#003B5C]/8 text-[#003B5C]',
    cyan: 'bg-[#00A6D6]/10 text-[#00A6D6]',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="card-modern p-4 transition-shadow hover:shadow-card-hover">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorMap[color]}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}