import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, AlertCircle, LogOut, Loader2, GraduationCap, Mail } from 'lucide-react';

export default function AuthorizationGate({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setStatus('unauthorized');
          setLoading(false);
          return;
        }
        setUserEmail(user.email || '');
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #003B5C 0%, #00547A 50%, #00A6D6 100%)' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-white/80 animate-spin" />
            <span className="text-white/80 text-sm font-medium">Verificando acesso...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending' || status === 'rejected') {
    const isPending = status === 'pending';
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #003B5C 0%, #00547A 50%, #00A6D6 100%)' }}>
        {/* Decorative blurred circles */}
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#00A6D6]/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/4a16a00af_CapturadeTela2026-06-26as152625.png"
              alt="Alliage Training & Education"
              className="h-16 w-auto"
            />
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`h-2 ${isPending ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className="p-8 sm:p-10">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 ${isPending ? 'bg-amber-50' : 'bg-red-50'}`}>
                  {isPending ? (
                    <Clock className="w-10 h-10 text-amber-500" />
                  ) : (
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-[#003B5C] mb-2">
                  {isPending ? 'Aguardando Aprovação' : 'Acesso Negado'}
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 px-2">
                  {isPending
                    ? 'Seu acesso ao portal está pendente de aprovação do administrador. Você receberá um email assim que for autorizado.'
                    : 'Sua solicitação de acesso foi rejeitada. Entre em contato com o administrador para mais informações.'}
                </p>
              </div>

              {userEmail && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-500 truncate">{userEmail}</span>
                </div>
              )}

              <button
                onClick={() => base44.auth.logout('/login')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl bg-[#003B5C] hover:bg-[#002D44] transition-colors shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>

          <p className="text-center text-white/40 text-xs mt-6">
            © {new Date().getFullYear()} Alliage Academy. Todos os direitos reservados.
          </p>
        </div>
      </div>
    );
  }

  return children;
}