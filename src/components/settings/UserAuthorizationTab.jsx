import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Loader2, Search } from 'lucide-react';

export default function UserAuthorizationTab() {
  const [auths, setAuths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [updating, setUpdating] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await base44.functions.invoke('listUserAuthorizations', {});
      setAuths(response.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (auth, role) => {
    if (!role) return;
    setUpdating(auth.id);
    try {
      await base44.functions.invoke('updateUserAuthorization', {
        id: auth.id,
        status: 'approved',
        role,
        approved_by: user.id,
        approved_date: new Date().toISOString()
      });
      // With public app + login required, users self-register, so invite may fail if user already exists — that's OK
      try {
        const platformRole = role === 'admin' ? 'admin' : 'user';
        await base44.users.inviteUser(auth.email, platformRole);
      } catch (inviteErr) {
        // User already registered — approval status is already saved, so this is fine
        console.log('Invite skipped (user may already exist):', inviteErr.message);
      }
      await loadData();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (auth) => {
    const reason = prompt('Motivo da rejeição:');
    if (!reason) return;
    setUpdating(auth.id);
    try {
      await base44.functions.invoke('updateUserAuthorization', {
        id: auth.id,
        status: 'rejected',
        rejection_reason: reason
      });
      await loadData();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredAuths = auths.filter(a => {
    const matchSearch = a.email.toLowerCase().includes(search.toLowerCase()) || 
                        (a.full_name && a.full_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === '' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome..."
            className="input-base pl-9 w-full"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-base sm:w-48"
        >
          <option value="">Todos</option>
          <option value="pending">Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
        </select>
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
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuths.map(auth => (
                  <tr key={auth.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{auth.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{auth.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        auth.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        auth.status === 'approved' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {auth.status === 'pending' ? 'Pendente' : auth.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {auth.role ? (
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {auth.role === 'solicitante' ? 'Solicitante' :
                           auth.role === 'educador' ? 'Educador' :
                           auth.role === 'gerente_regional' ? 'Gerente Regional' : 'Admin'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {auth.status === 'pending' ? (
                        <div className="flex gap-1.5 justify-center">
                          <select
                            onChange={e => handleApprove(auth, e.target.value)}
                            disabled={updating === auth.id}
                            defaultValue=""
                            className="px-2 py-1 text-xs border border-green-200 rounded text-green-700 bg-green-50 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="">Aprovar...</option>
                            <option value="solicitante">✓ Solicitante</option>
                            <option value="educador">✓ Educador</option>
                            <option value="gerente_regional">✓ Gerente Regional</option>
                            <option value="admin">✓ Admin</option>
                          </select>
                          <button
                            onClick={() => handleReject(auth)}
                            disabled={updating === auth.id}
                            className="px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center gap-1"
                          >
                            {updating === auth.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
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