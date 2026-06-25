import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, AlertCircle, Clock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const response = await base44.functions.invoke('checkUserAuthorization', { email });
      if (response.data?.authorized) {
        // Usuário aprovado, redireciona para o dashboard
        window.location.href = "/";
      } else {
        // Usuário pendente ou rejeitado
        setAuthStatus(response.data?.status || 'pending');
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Error checking authorization:', err);
      setAuthStatus('pending');
      setIsLoggedIn(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthStatus(null);
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // Após login, verifica status de autorização
      await checkAuthStatus();
    } catch (err) {
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  // Se está logado mas aguardando aprovação
  if (isLoggedIn && authStatus === 'pending') {
    return (
      <AuthLayout
        icon={LogIn}
        title="Aguardando Aprovação"
        subtitle="Sua conta está pendente de aprovação"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-200">
            <div className="flex gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Acesso Pendente</p>
                <p className="text-xs opacity-75 mt-1">Seu acesso ao portal está aguardando aprovação do administrador. Você receberá um email quando for autorizado.</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              base44.auth.logout();
              setIsLoggedIn(false);
              setAuthStatus(null);
            }}
          >
            Sair
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (isLoggedIn && authStatus === 'rejected') {
    return (
      <AuthLayout
        icon={LogIn}
        title="Acesso Negado"
        subtitle="Sua solicitação foi rejeitada"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Acesso Recusado</p>
                <p className="text-xs opacity-75 mt-1">Sua solicitação de acesso foi rejeitada. Contate o administrador para mais informações.</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              base44.auth.logout();
              setIsLoggedIn(false);
              setAuthStatus(null);
            }}
          >
            Sair
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Bem-vindo ao Portal"
      subtitle="Acesse sua conta do Alliage Academy"
      footer={
        <>
          Novo por aqui?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Criar uma conta
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continuar com Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Acessando...
            </>
          ) : (
            "Acessar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}