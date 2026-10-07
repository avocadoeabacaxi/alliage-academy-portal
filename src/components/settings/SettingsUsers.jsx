import React, { useState, useEffect } from 'react';
import { alliage } from '@/api/alliageClient';
import { inviteAuthorizedUser } from '@/lib/inviteAuthorizedUser';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { UserPlus, Shield, Mail, MapPin, Loader2, X, Search, Edit, CheckCircle2, Lock, ChevronDown, ChevronUp, Users as UsersIcon, KeyRound, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  gerente_regional: ['dashboard', 'requests', 'newRequest', 'users', 'approveStage2', 'reject', 'export'],
  educador: ['dashboard', 'requests', 'newRequest', 'users', 'approveStage1', 'reject', 'execute', 'closeCycle', 'generateSurvey'],
  solicitante: ['dashboard', 'requests', 'newRequest']
};

const PERMISSION_LABELS = {
  dashboard: { pt: 'Ver Dashboard', en: 'View Dashboard', es: 'Ver Panel' },
  requests: { pt: 'Ver Solicitações', en: 'View Requests', es: 'Ver Solicitudes' },
  newRequest: { pt: 'Criar Solicitações', en: 'Create Requests', es: 'Crear Solicitudes' },
  users: { pt: 'Visualizar Usuários', en: 'View Users', es: 'Ver Usuarios' },
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

export default function SettingsUsers({ canManage = false }) {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadError, setLoadError] = useState('');
  const [approvalUser, setApprovalUser] = useState(null);
  const [approvalRole, setApprovalRole] = useState('solicitante');
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [editForm, setEditForm] = useState({ role: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'solicitante', region: 'Brasil' });
  const [inviteMsg, setInviteMsg] = useState('');
  const [showPerms, setShowPerms] = useState(false);
  const [sendingReset, setSendingReset] = useState(null);
  const [savingNotification, setSavingNotification] = useState(null);
  const [resetMsg, setResetMsg] = useState({});
  const [modalUser, setModalUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSendAccess = async (user) => {
    setSendingReset(user.id);
    try {
      const response = await alliage.functions.invoke('sendPasswordReset', { email: user.email, preferred_language: user.preferred_language || lang });
      const data = response.data || {};
      const msg = data.message || 'Email enviado com sucesso!';
      setResetMsg(prev => ({ ...prev, [user.id]: msg }));
    } catch (e) {
      setResetMsg(prev => ({ ...prev, [user.id]: 'Erro: ' + e.message }));
    } finally {
      setSendingReset(null);
      setTimeout(() => {
        setResetMsg(prev => { const c = { ...prev }; delete c[user.id]; return c; });
      }, 5000);
    }
  };

  const handleNotificationToggle = async (user) => {
    setSavingNotification(user.id);
    const nextValue = !user.receive_access_request_emails;
    try {
      await alliage.entities.User.update(user.id, { receive_access_request_emails: nextValue });
      setUsers(prev => prev.map(item => item.id === user.id ? { ...item, receive_access_request_emails: nextValue } : item));
    } catch (e) {
      alert('Erro ao atualizar preferência: ' + e.message);
    } finally {
      setSavingNotification(null);
    }
  };

  const loadUsers = async () => {
    setLoadError('');
    try {
      const authResponse = await alliage.functions.invoke('listUserAuthorizations', {});
      const allAuths = authResponse.data?.data || [];
      if (!canManage) {
        setUsers(allAuths.filter(a => a.status === 'approved').map(a => ({ ...a, role: a.role || 'solicitante' })));
        return;
      }
      setUsers(authResponse.data?.users || []);
    } catch (e) {
      console.error(e);
      setLoadError('Não foi possível atualizar os usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setSaving(true);
    try {
      const result = await inviteAuthorizedUser({ ...inviteForm, preferred_language: lang });
      setInviteMsg(result.notificationError || 'Acesso aprovado. Convite solicitado com sucesso.');
      setInviteForm({ email: '', role: 'solicitante', region: 'Brasil' });
      setTimeout(() => setInviteMsg(''), 5000);
      await loadUsers();
    } catch (e) {
      setInviteMsg('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAccess = async () => {
    if (!approvalUser || approving) return;
    setApproving(true);
    setApprovalError('');
    setApprovalMessage('');
    try {
      const result = await inviteAuthorizedUser({
        email: approvalUser.email, full_name: approvalUser.full_name,
        role: approvalRole, region: approvalUser.region || 'Brasil',
        preferred_language: approvalUser.preferred_language || lang,
      });
      setApprovalMessage(`${approvalUser.email}: ${result.notificationError || 'acesso aprovado e confirmado no sistema.'}`);
      setApprovalUser(null);
      await loadUsers();
    } catch (e) {
      setApprovalError(e.message || 'Não foi possível aprovar o acesso.');
    } finally {
      setApproving(false);
    }
  };

  const handleUpdateUser = async (userId) => {
    if (!editForm.role) return;
    
    setSaving(true);
    try {
      const targetUser = users.find(u => u.id === userId);
      const email = targetUser?.email?.toLowerCase();
      // 1. Update UserAuthorization role (source of truth) — same as the authorization tab
      if (email) {
        const authResponse = await alliage.functions.invoke('listUserAuthorizations', {});
        const auth = (authResponse.data?.data || []).find(a => a.email?.toLowerCase() === email);
        if (auth) {
          await alliage.functions.invoke('updateUserAuthorization', { id: auth.id, role: editForm.role, region: editForm.region });
        }
      }
      // 2. Sync platform User role (admin/user) so platform-level admin privileges match the app role
      if (!targetUser?.pending_registration) {
        const platformRole = editForm.role === 'admin' ? 'admin' : 'user';
        await alliage.entities.User.update(userId, { role: platformRole, region: editForm.region });
      }
      await loadUsers();
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
    const matchesStatus = !filterStatus || userStatus(u) === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
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
                  {t(`role.${r}`)}
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
                        {t(`role.${r}`)}
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
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{canManage ? 'Gerenciar Usuários' : 'Visualizar Usuários'}</h3>
        <p className="text-sm text-slate-500">O perfil define as permissões. Somente o status Aprovado libera a entrada no portal.</p>
      </div>
      {loadError && <div role="alert" className="text-sm text-red-700">{loadError} <button onClick={loadUsers} className="underline">Atualizar lista</button></div>}
      {approvalMessage && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{approvalMessage}</p>}

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
            {ROLES.map(r => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </select>
          <select aria-label="Filtrar por status de acesso" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-base w-40">
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
          </select>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Usuário
          </button>
        )}
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
              {ROLES.map(r => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Papel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status do acesso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Região</th>
                {canManage && <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Receber pedidos de acesso</th>}
                {canManage && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${user.pending_registration ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.full_name || user.email} className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#00A6D6]/10 text-[#003B5C] flex items-center justify-center text-sm font-semibold shrink-0">
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">{user.full_name || 'Sem nome'}</span>
                          {user.pending_registration && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                              Cadastro não concluído
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 truncate block">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${ROLE_STYLES[user.role] || ROLE_STYLES.solicitante}`}>
                      {t(`role.${user.role}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${ACCESS_STATUS[userStatus(user)].style}`}>
                      {ACCESS_STATUS[userStatus(user)].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {user.region || '—'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-center">
                      {user.role === 'admin' && userStatus(user) === 'approved' && !user.authorization_only && !user.pending_registration ? (
                        <label className="inline-flex items-center justify-center cursor-pointer" title="Receber email quando alguém solicitar acesso">
                          <input
                            type="checkbox"
                            checked={user.receive_access_request_emails === true}
                            onChange={() => handleNotificationToggle(user)}
                            disabled={savingNotification === user.id}
                            className="w-4 h-4 accent-[#00A6D6] disabled:opacity-50"
                          />
                        </label>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {userStatus(user) === 'pending' && (
                          <button onClick={() => { setApprovalUser(user); setApprovalRole(ROLES.includes(user.role) ? user.role : 'solicitante'); setApprovalError(''); }} className="whitespace-nowrap rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-100">
                            Aprovar acesso
                          </button>
                        )}
                        {userStatus(user) === 'approved' && (
                        <button onClick={() => handleSendAccess(user)} disabled={sendingReset === user.id} title={user.pending_registration ? 'Enviar link de acesso / senha' : 'Redefinir senha (enviar por email)'} className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${user.pending_registration ? 'text-[#00A6D6] hover:bg-[#00A6D6]/10' : 'text-slate-500 hover:bg-slate-100'}`}>
                          {sendingReset === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : user.pending_registration ? <><Send className="w-4 h-4" /><span className="hidden lg:inline">Enviar convite</span></> : <><KeyRound className="w-4 h-4" /><span className="hidden lg:inline">Redefinir senha</span></>}
                        </button>
                        )}
                        {!user.authorization_only && !user.pending_registration && (
                          <button onClick={() => { setModalUser(user); setEditForm({ role: user.role, region: user.region || '' }); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Editar usuário">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {resetMsg[user.id] && <div className={`mt-1 text-xs ${resetMsg[user.id].includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{resetMsg[user.id]}</div>}
                    </td>
                  )}
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

      <Dialog open={!!approvalUser} onOpenChange={open => { if (!open && !approving) setApprovalUser(null); }}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Aprovar acesso</DialogTitle>
            <DialogDescription>Esta ação libera a entrada no portal com o perfil escolhido. O status será confirmado no servidor.</DialogDescription>
          </DialogHeader>
          <p className="break-all text-sm font-semibold">{approvalUser?.email}</p>
          <label htmlFor="approval-role" className="text-sm">Perfil do acesso</label>
          <select id="approval-role" value={approvalRole} onChange={e => setApprovalRole(e.target.value)} disabled={approving} className="input-base">
            {ROLES.map(role => <option key={role} value={role}>{t(`role.${role}`)}</option>)}
          </select>
          {approvalError && <p role="alert" className="text-sm text-red-700">{approvalError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setApprovalUser(null)} disabled={approving} className="rounded-full px-4 py-2 text-sm">Cancelar</button>
            <button onClick={handleApproveAccess} disabled={approving} className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {approving ? 'Confirmando aprovação...' : 'Confirmar aprovação'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={!!modalUser} onOpenChange={(open) => !open && setModalUser(null)}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 border-slate-200 [&>button]:text-slate-400 [&>button:hover]:text-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Editar Usuário</DialogTitle>
            <DialogDescription className="text-slate-500">Atualize o papel e a região deste usuário. Alterar o perfil não aprova um acesso pendente; use Aprovar acesso na lista.</DialogDescription>
          </DialogHeader>
          {modalUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                {modalUser.photo_url ? (
                  <img src={modalUser.photo_url} alt={modalUser.full_name || modalUser.email} className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#00A6D6]/10 text-[#003B5C] flex items-center justify-center text-sm font-semibold shrink-0">
                    {(modalUser.full_name || modalUser.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{modalUser.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {modalUser.email}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="input-base"
                >
                  {ROLES.map(r => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Região</label>
                <select
                  value={editForm.region}
                  onChange={e => setEditForm({ ...editForm, region: e.target.value })}
                  className="input-base"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { handleUpdateUser(modalUser.id); setModalUser(null); }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ACCESS_STATUS = {
  pending: { label: 'Pendente', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprovado', style: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejeitado', style: 'bg-red-50 text-red-700 border-red-200' },
};

function userStatus(user) {
  return ACCESS_STATUS[user.status] ? user.status : 'pending';
}
