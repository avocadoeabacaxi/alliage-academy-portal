import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Mail, Users as UsersIcon, AlertCircle, Loader2, Lock, Route } from 'lucide-react';
import EmailTemplates from '@/components/settings/EmailTemplates';
import SettingsUsers from '@/components/settings/SettingsUsers';
import UserAuthorizationTab from '@/components/settings/UserAuthorizationTab';
import RoutingTab from '@/components/settings/RoutingTab';

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('authorization');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async u => {
      const response = await base44.functions.invoke('checkUserAuthorization', { email: u.email });
      const appRole = response.data?.status === 'approved' ? response.data.role : u.role;
      setUser({ ...u, role: appRole });
      if (appRole !== 'admin') setActiveTab('users');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  const canManage = user?.role === 'admin';
  const canViewUsers = canManage || user?.role === 'gerente_regional' || user?.role === 'educador';

  if (!canViewUsers) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold">Acesso negado.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-[#003B5C] hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#003B5C]">Configurações</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {canManage && (
          <>
            <TabButton active={activeTab === 'authorization'} onClick={() => setActiveTab('authorization')} icon={Lock} label="Autorizações" />
            <TabButton active={activeTab === 'emails'} onClick={() => setActiveTab('emails')} icon={Mail} label="Templates de Email" />
          </>
        )}
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={UsersIcon} label="Usuários" />
        {canManage && <TabButton active={activeTab === 'routing'} onClick={() => setActiveTab('routing')} icon={Route} label="Roteamento" />}
      </div>

      {/* Content */}
      <div>
        {canManage && activeTab === 'authorization' && <UserAuthorizationTab />}
        {canManage && activeTab === 'emails' && <EmailTemplates />}
        {activeTab === 'users' && <SettingsUsers canManage={canManage} />}
        {canManage && activeTab === 'routing' && <RoutingTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${active ? 'border-[#00A6D6] text-[#00A6D6]' : 'border-transparent text-slate-600 hover:text-slate-800'}`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}