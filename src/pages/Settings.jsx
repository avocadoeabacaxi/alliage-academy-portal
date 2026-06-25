import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Mail, Users as UsersIcon, AlertCircle, Loader2 } from 'lucide-react';
import EmailTemplates from '@/components/settings/EmailTemplates';
import SettingsUsers from '@/components/settings/SettingsUsers';

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('emails');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!user?.role === 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold">Acesso negado. Apenas admins podem acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
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
        <button
          onClick={() => setActiveTab('emails')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'emails'
              ? 'border-[#00A6D6] text-[#00A6D6]'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          Templates de Email
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-[#00A6D6] text-[#00A6D6]'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          Usuários
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'emails' && <EmailTemplates />}
        {activeTab === 'users' && <SettingsUsers />}
      </div>
    </div>
  );
}