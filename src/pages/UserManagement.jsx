import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { inviteAuthorizedUser } from '@/lib/inviteAuthorizedUser';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { UserPlus, Shield, Mail, MapPin, Loader2, Check, X, Search, ChevronDown, ChevronUp, Lock, Edit, CheckCircle2, Users as UsersIcon } from 'lucide-react';

const ROLES = ['admin', 'gerente_regional', 'educador', 'solicitante'];
const REGIONS = ['Brasil', 'LATAM', 'USA', 'ROW'];

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

const ROLE_STYLES = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  gerente_regional: 'bg-purple-50 text-purple-700 border-purple-200',
  educador: 'bg-[#00A6D6]/10 text-[#003B5C] border-blue-200',
  solicitante: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function UserManagement() {
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
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await base44.entities.User.list('created_date', 200);
      setUsers(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    }
    return true;
  });

  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({ role: user.role || 'solicitante', region: user.region || '' });
    setError('');
  };

  const saveEdit = async (userId) => {
    setSaving(true);
    setError('');
    try {
      await base44.entities.User.update(userId, { role: editForm.role, region: editForm.region });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: editForm.role, region: editForm.region } : u));
      setEditingUser(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    setSaving(true);
    setInviteMsg('');
    setError('');
    try {
      await inviteAuthorizedUser(inviteForm);
      setInviteMsg('Convite enviado. O usuário receberá o link para criar sua senha.');
      setInviteForm({ email: '', role: 'solicitante', region: 'Brasil' });
      setTimeout(() => { setShowInvite(false); setInviteMsg(''); }, 2000);
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003B5C]">{t('users.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('users.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPerms(!showPerms)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            {t('users.permissions')}
            {showPerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t('users.invite')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Permissions Matrix */}
      {showPerms && (
        <div className="mb-6 card-modern overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">{t('users.permissionsMatrix')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{t('users.permission')}</th>
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
                    <td className="px-4 py-2.5 text-slate-700">{labels[lang]}</td>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00A6D6]/20 focus:border-[#00A6D6]"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">{t('common.all')}</option>
          {ROLES.map(r => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
        </select>
      </div>

      {/* Stats */}
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

      {/* User List */}
      <div className="card-modern overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">{t('common.noResults')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{t('users.name')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{t('users.role')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{t('users.region')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{t('users.joined')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{u.full_name || '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingUser === u.id ? (
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm({...editForm, role: e.target.value})}
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_STYLES[u.role || 'solicitante']}`}>
                          {t(`role.${u.role || 'solicitante'}`)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingUser === u.id ? (
                        <select
                          value={editForm.region}
                          onChange={e => setEditForm({...editForm, region: e.target.value})}
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="">—</option>
                          {REGIONS.map(r => <option key={r} value={r}>{t(`region.${r.toLowerCase()}`)}</option>)}
                        </select>
                      ) : (
                        u.region ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {t(`region.${u.region.toLowerCase()}`)}
                          </span>
                        ) : <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.created_date ? new Date(u.created_date).toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es' : 'en-US') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingUser === u.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(u.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#00A6D6] hover:bg-[#00A6D6]/10 transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#00A6D6]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#00A6D6]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('users.invite')}</h3>
                <p className="text-xs text-slate-500">{t('users.inviteDesc')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('users.email')}</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                  placeholder="nome@alliage.com"
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('users.role')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setInviteForm({...inviteForm, role: r})}
                      className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${inviteForm.role === r ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                    >
                      {t(`role.${r}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('users.region')}</label>
                <select
                  value={inviteForm.region}
                  onChange={e => setInviteForm({...inviteForm, region: e.target.value})}
                  className="input-base"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{t(`region.${r.toLowerCase()}`)}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-1">{t('users.regionNote')}</p>
              </div>
            </div>

            {inviteMsg && (
              <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {inviteMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteForm.email || saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {t('users.sendInvite')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}