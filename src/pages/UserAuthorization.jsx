import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserAuthorization() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [auths, setAuths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== 'admin') {
        navigate('/');
        return;
      }
      setUser(u);
      loadData();
    }).catch(() => navigate('/'));
  }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.UserAuthorization.list('-created_date', 100);
      setAuths(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (auth, role) => {
    setUpdating(auth.id);
    try {
      await base44.entities.UserAuthorization.update(auth.id, {
        status: 'approved',
        role,
        approved_by: user.id,
        approved_date: new Date().toISOString()
      });
      await loadData();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (auth, reason) => {
    const r = prompt('Motivo da rejeição:');
    if (!r) return;
    setUpdating(auth.id);
    try {
      await base44.entities.UserAuthorization.update(auth.id, {
        status: 'rejected',
        rejection_reason: r
      });
      await loadData();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredAuths = auths.filter(a => filterStatus === '' || a.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-[#003B5C] hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#003B5C]">Autorização de Usuários</h1>
          <p className="text-sm text-slate-500">Aprove ou rejeite acessos ao portal</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-modern p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Pendente</div>
          <p className="text-2xl font-bold text-amber-600">{auths.filter(a => a.status === 'pending').length}</p>
        </div>
        <div className="card-modern p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Aprovado</div>
          <p className="text-2xl font-bold text-green-600">{auths.filter(a => a.status === 'approved').length}</p>
        </div>
        <div className="card-modern p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Rejeitado</div>
          <p className="text-2xl font-bold text-red-600">{auths.filter(a => a.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === s
                ? 'bg-[#00A6D6] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'pending' ? 'Pendente' : s === 'approved' ? 'Aprovado' : s === 'rejected' ? 'Rejeitado' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-modern overflow-hidden">
        {filteredAuths.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">Nenhum usuário encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Primeiro Acesso</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuths.map(auth => (
                  <tr key={auth.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{auth.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{auth.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        auth.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        auth.status === 'approved' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {auth.status === 'pending' ? 'Pendente' : auth.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {auth.first_login_attempt ? new Date(auth.first_login_attempt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {auth.status === 'pending' ? (
                        <div className="flex gap-2 justify-center">
                          <select
                            value=""
                            onChange={e => handleApprove(auth, e.target.value)}
                            disabled={updating === auth.id}
                            className="px-2 py-1 text-xs border border-green-200 rounded text-green-700 bg-green-50 disabled:opacity-50"
                          >
                            <option value="">Escolher role...</option>
                            <option value="solicitante">Solicitante</option>
                            <option value="educador">Educador</option>
                            <option value="gerente_regional">Gerente Regional</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleReject(auth)}
                            disabled={updating === auth.id}
                            className="px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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