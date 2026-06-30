import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { UserPlus, Shield, Mail, MapPin, Loader2, Check, X, Search, Eye, Edit, CheckCircle2, Lock, ChevronDown, ChevronUp, Users as UsersIcon, KeyRound, Send } from 'lucide-react';

const ROLES = ['admin', 'gerente_regional', 'educador', 'solicitante'];
const REGIONS = ['Brasil', 'LATAM', 'USA', 'ROW'];

const ROLE_STYLES = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  gerente_regional: 'bg-purple-50 text-purple-700 border-purple-200',
  educador: 'bg-[#00A6D6]/10 text-[#003B5C] border-blue-200',
  solicitante: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'requests', 'newRequest', 'users', 'approveStage1', 'approveStage2', 'reject', 'execute', 'closeCycle', 'generateSurvey', 'manageUsers', 'export', 'deleteRequests'],
  gerente_regional: ['dashboard', 'requests', 'newRequest', 'approveStage2', 'reject', 'export'],
  educador: ['dashboard', 'requests', 'newRequest', 'approveStage1', 'reject', 'execute', 'closeCycle', 'generateSurvey'],
  solicitante: ['dashboard', 'requests', 'newRequest']
};

const PERMISSION_LABELS = {
  dashboard: { pt: 'Ver Dashboard', en: 'View Dashboard', es: 'Ver Panel' },
  requests: { pt: 'Ver Solicitações', en: 'View Requests', es: 'Ver Solicitudes' },
  newRequest: { pt: 'Criar Solicitações', en: 'Create Requests', es: 'Crear Solicitudes' },
  approveStage1: { pt: 'Aprovar Etapa 1', en: 'Approve Stage 1', es: 'Aprobar Etapa 1' },
  approveStage2: { pt: 'Aprovar Etapa 2', en: 'Approve Stage 2', es: 'Aprobar Etapa 2' },
  reject: { pt: 'Rejeitar Solicitações', en: 'Reject Requests', es: 'Rechazar Solicitudes' },
  execute: { pt: 'Registrar Execução', en: 'Record Execution', es: 'Registrar Ejecución' },
  closeCycle: { pt: 'Fechar Ciclo', en: 'Close Cycle', es: 'Cerrar Ciclo' },
  generateSurvey: { pt: 'Gerar Pesquisas', en: 'Generate Surveys', es: 'Generar Encuestas' },
  manageUsers: { pt: 'Gerenciar Usuários', en: 'Manage Users', es: 'Gestionar Usuarios' },
  export: { pt: 'Exportar Dados', en: 'Export Data', es: 'Exportar Datos' },
  deleteRequests: { pt: 'Excluir Solicitações', en: 'Delete Requests', es: 'Eliminar Solicitudes' },
};

export default function SettingsUsers() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'solicitante', region: 'Brasil' });
  const [inviteMsg, setInviteMsg] = useState('');
  const [showPerms, setShowPerms] = useState(false);
  const [sendingReset, setSendingReset] = useState(null);
  const [resetMsg, setResetMsg] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSendAccess = async (user) => {
    setSendingReset(user.id);
    try {
      // For pending_registration users, ensure they have a platform account via invite first
      if (user.pending_registration) {
        try {
          const platformRole = user.role === 'admin' ? 'admin' : 'user';
          await base44.users.inviteUser(user.email, platformRole);
        } catch (e) {
          // User may already exist on the platform — that's fine, proceed to password reset
        }
      }
      // Send password reset email
      await base44.auth.resetPasswordRequest(user.email);
      setResetMsg(prev => ({ ...prev, [user.id]: 'Email de redefinição de senha enviado com sucesso!' }));
      // Remove pending_registration flag since they now have a platform account invitation
      if (user.pending_registration) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, pending_registration: false } : u));
      }
    } catch (e) {
      setResetMsg(prev => ({ ...prev, [user.id]: 'Erro: ' + e.message }));
    } finally {
      setSendingReset(null);
      setTimeout(() => {
        setResetMsg(prev => { const c = { ...prev }; delete c[user.id]; return c; });
      }, 4000);
    }
  };

  const loadUsers = async () => {
    try {
      const [platformUsers, authResponse] = await Promise.all([
        base44.entities.User.list('created_date', 200),
        base44.functions.invoke('listUserAuthorizations', {})
      ]);
      const approvedAuths = (authResponse.data?.data || []).filter(a => a.status === 'approved');
      const platformEmails = new Set((platformUsers || []).map(u => u.email?.toLowerCase()));
      // approved authorizations not yet registered on the platform
      const pendingRegistrations = approvedAuths
        .filter(a => !platformEmails.has(a.email?.toLowerCase()))
        .map(a => ({
          id: `auth_${a.id}`,
          email: a.email,
          full_name: a.full_name || '',
          role: a.role || 'solicitante',
          region: '',
          created_date: a.approved_date || a.first_login_attempt,
          pending_registration: true,
        }));
      setUsers([...platformUsers, ...pendingRegistrations]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) return;
    
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.role);
      setInviteMsg('Convite enviado com sucesso!');
      setInviteForm({ email: '', role: 'solicitante', region: 'Brasil' });
      setTimeout(() => setInviteMsg(''), 3000);
    } catch (e) {
      setInviteMsg('Erro: ' + e.message);
    }
  };

  const handleUpdateUser = async (userId) => {
    if (!editForm.role) return;
    
    setSaving(true);
    try {
      await base44.entities.User.update(userId, { role: editForm.role, region: editForm.region });
      await loadUsers();
      setEditingUser(null);
    } catch (e) {
      alert('Erro ao atualizar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || 
                         u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !filterRole || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r).length;
          return (
            <div key={r} className="card-modern p-4">
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[r]}`}>
                  {r}
                </span>
                <UsersIcon className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-[#003B5C]">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Permissions Toggle */}
      <button
        onClick={() => setShowPerms(!showPerms)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
      >
        <Shield className="w-4 h-4" />
        Matriz de Permissões
        {showPerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Permissions Matrix */}
      {showPerms && (
        <div className="card-modern overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Permissões por Papel</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Permissão</th>
                  {ROLES.map(r => (
                    <th key={r} className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_STYLES[r]}`}>
                        {r}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERMISSION_LABELS).map(([perm, labels]) => (
                  <tr key={perm} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{labels.pt}</td>
                    {ROLES.map(r => (
                      <td key={r} className="px-4 py-2.5 text-center">
                        {ROLE_PERMISSIONS[r].includes(perm) ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Gerenciar Usuários</h3>
      </div>

      {/* Header com Invite */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por email ou nome..."
              className="input-base pl-10"
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="input-base w-40">
            <option value="">Todos os papéis</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] transition-colors whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Convidar Usuário
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="card-modern p-4 space-y-3 border-l-4 border-[#00A6D6]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              value={inviteForm.email}
              onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="Email do usuário"
              className="input-base"
            />
            <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="input-base">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={inviteForm.region} onChange={e => setInviteForm({ ...inviteForm, region: e.target.value })} className="input-base">
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            onClick={handleInvite}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] transition-colors"
          >
            Enviar Convite
          </button>
          {inviteMsg && (
            <p className={`text-sm ${inviteMsg.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="card-modern overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Papel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Região</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${user.pending_registration ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{user.email}</span>
                      {user.pending_registration && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                          Convite pendente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-700">{user.full_name || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {editingUser === user.id ? (
                      <select
                        value={editForm.role}
                        onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                        className="input-base text-xs h-8"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${ROLE_STYLES[user.role] || ROLE_STYLES.solicitante}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser === user.id ? (
                      <select
                        value={editForm.region}
                        onChange={e => setEditForm({ ...editForm, region: e.target.value })}
                        className="input-base text-xs h-8"
                      >
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {user.region || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingUser === user.id ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateUser(user.id)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendAccess(user)}
                          disabled={sendingReset === user.id}
                          title={user.pending_registration ? 'Enviar link de acesso / senha' : 'Redefinir senha (enviar por email)'}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${user.pending_registration ? 'text-[#00A6D6] hover:bg-[#00A6D6]/10' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {sendingReset === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.pending_registration ? (
                            <>
                              <Send className="w-4 h-4" />
                              <span className="hidden lg:inline">Liberar acesso</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4" />
                              <span className="hidden lg:inline">Redefinir senha</span>
                            </>
                          )}
                        </button>
                        {!user.pending_registration && (
                          <button
                            onClick={() => {
                              setEditingUser(user.id);
                              setEditForm({ role: user.role, region: user.region || '' });
                            }}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    {resetMsg[user.id] && (
                      <div className={`mt-1 text-xs ${resetMsg[user.id].includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
                        {resetMsg[user.id]}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}