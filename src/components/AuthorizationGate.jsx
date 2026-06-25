import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, AlertCircle, LogOut, Loader2 } from 'lucide-react';

export default function AuthorizationGate({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setStatus('unauthorized');
          setLoading(false);
          return;
        }
        const response = await base44.functions.invoke('checkUserAuthorization', { email: user.email });
        const authStatus = response.data?.status || 'pending';
        setStatus(authStatus);
      } catch (e) {
        setStatus('pending');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-[#00A6D6] animate-spin" />
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-[#003B5C] mb-2">Aguardando Aprovação</h1>
          <p className="text-sm text-slate-500 mb-6">Seu acesso ao portal está pendente de aprovação do administrador. Você receberá um email quando for autorizado.</p>
          <button
            onClick={() => base44.auth.logout('/')}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#003B5C] bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-[#003B5C] mb-2">Acesso Negado</h1>
          <p className="text-sm text-slate-500 mb-6">Sua solicitação de acesso foi rejeitada. Contate o administrador para mais informações.</p>
          <button
            onClick={() => base44.auth.logout('/')}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#003B5C] bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    );
  }

  return children;
}