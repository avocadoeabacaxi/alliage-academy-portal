import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Loader2, CheckCircle2, AlertCircle, LogOut, Clock } from 'lucide-react';

const UserNotRegisteredError = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [existingStatus, setExistingStatus] = useState(null);

  useEffect(() => {
    // Tenta obter dados do usuário logado para pré-preencher
    base44.auth.me().then(u => {
      if (u?.email) setEmail(u.email);
      if (u?.full_name) setFullName(u.full_name);
      // Verifica se já existe solicitação
      base44.functions.invoke('requestAccess', { email: u.email, full_name: u.full_name })
        .then(res => {
          if (!res.data?.success && res.data?.status) {
            setExistingStatus(res.data.status);
            setMessage(res.data?.message || '');
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await base44.functions.invoke('requestAccess', { email, full_name: fullName });
      if (response.data?.success) {
        setSuccess(true);
        setMessage(response.data.message);
      } else if (response.data?.status) {
        setExistingStatus(response.data.status);
        setMessage(response.data?.message || '');
      } else {
        setError(response.data?.message || 'Erro ao solicitar acesso');
      }
    } catch (err) {
      setError(err.message || 'Erro ao solicitar acesso');
    } finally {
      setLoading(false);
    }
  };

  // Se já tem solicitação pendente/reprovada, mostra o status
  if (existingStatus === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
          <div className="flex justify-center mb-6">
            <img
              src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/ecfb855b4_alliagi.png"
              alt="Alliage Training & Education"
              className="h-14 w-auto"
            />
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-amber-100">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#003B5C] mb-3">Aguardando Aprovação</h1>
            <p className="text-slate-600 mb-6 text-sm">{message || 'Seu acesso ao portal está pendente de aprovação do administrador.'}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => base44.auth.logout('/')}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (existingStatus === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
          <div className="flex justify-center mb-6">
            <img
              src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/ecfb855b4_alliagi.png"
              alt="Alliage Training & Education"
              className="h-14 w-auto"
            />
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#003B5C] mb-3">Acesso Negado</h1>
            <p className="text-slate-600 mb-6 text-sm">{message || 'Sua solicitação de acesso foi rejeitada. Contate o administrador.'}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => base44.auth.logout('/')}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sucesso - solicitação enviada
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
          <div className="flex justify-center mb-6">
            <img
              src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/ecfb855b4_alliagi.png"
              alt="Alliage Training & Education"
              className="h-14 w-auto"
            />
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#003B5C] mb-3">Solicitação Enviada!</h1>
            <p className="text-slate-600 mb-6 text-sm">{message}</p>
            <div className="p-4 rounded-xl bg-green-50 text-green-800 text-sm border border-green-200 text-left">
              <p className="font-semibold mb-1">Próximos passos:</p>
              <p className="text-xs opacity-75">O administrador receberá sua solicitação e, ao aprová-la, você receberá um email com o convite para acessar o portal.</p>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => base44.auth.logout('/')}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de solicitação de acesso
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
        <div className="flex justify-center mb-6">
          <img
            src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/ecfb855b4_alliagi.png"
            alt="Alliage Training & Education"
            className="h-14 w-auto"
          />
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-[#00A6D6]/10">
            <UserPlus className="w-8 h-8 text-[#00A6D6]" />
          </div>
          <h1 className="text-2xl font-bold text-[#003B5C] mb-2">Solicitar Acesso</h1>
          <p className="text-sm text-slate-500">Você ainda não tem acesso ao portal. Preencha seus dados para solicitar.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium bg-[#00A6D6] hover:bg-[#0094BD]" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Solicitar Acesso'
            )}
          </Button>
        </form>

        <Button
          variant="ghost"
          className="w-full mt-3 text-slate-500"
          onClick={() => base44.auth.logout('/')}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Trocar de conta
        </Button>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;