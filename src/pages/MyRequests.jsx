import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { FileText, PlusCircle, Calendar } from 'lucide-react';

export default function MyRequests() {
  const { t, tf } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.TrainingRequest.list('-created_date', 500)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myRequests = requests.filter(r => r.created_by_id === user?.id || r.requester_email === user?.email);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003B5C]">{t('myRequests.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('myRequests.subtitle')}</p>
        </div>
        <Link to="/solicitacao" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] shadow-md shadow-[#00A6D6]/20 transition-colors">
          <PlusCircle className="w-4 h-4" />
          {t('nav.newRequest')}
        </Link>
      </div>

      {myRequests.length === 0 ? (
        <div className="card-modern p-8 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('list.empty')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('list.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {myRequests.map(r => (
            <Link key={r.id} to={`/requests/${r.id}`} className="card-modern p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow rounded-3xl">
              <div className="w-10 h-10 rounded-full bg-[#00A6D6]/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#00A6D6]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#003B5C]">{r.request_id}</span>
                  <StatusBadge status={r.status} t={t} />
                  <PriorityBadge priority={r.priority} t={t} />
                </div>
                <p className="text-sm text-slate-700 truncate mt-0.5">{r.product_name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.created_date?.split('T')[0]}</span>
                  {r.deadline_requested && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.deadline_requested}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}