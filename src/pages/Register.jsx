import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Register() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await base44.functions.invoke('requestAccess', { email, full_name: fullName });
      if (response.data?.success) {
        setSuccess(true);
        setMessage(response.data.message);
      } else {
        setError(response.data?.message || "Erro ao solicitar acesso");
      }
    } catch (err) {
      setError(err.message || "Erro ao solicitar acesso");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (success) {
    return (
      <AuthLayout
        icon={CheckCircle2}
        title="Solicitação Enviada!"
        subtitle={message}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-green-50 text-green-800 text-sm border border-green-200">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Aguarde Aprovação</p>
                <p className="text-xs opacity-75 mt-1">Sua solicitação foi enviada para o administrador. Você receberá um email com o convite assim que for aprovado.</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.reload()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Solicitar Acesso"
      subtitle="Preencha seus dados para solicitar acesso ao portal"
      footer={
        <>
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Fazer login
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
          <span className="bg-card px-3 text-muted-foreground">ou solicite acesso</span>
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
          <Label htmlFor="name">Nome Completo</Label>
          <div className="relative">
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="name"
              type="text"
              autoFocus
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
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            "Solicitar Acesso"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}