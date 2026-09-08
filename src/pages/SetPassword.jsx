import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertCircle, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("password"); // password | otp | reset-sent
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep("otp");
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      // User already has an account — show a message instead of triggering the platform's default email
      if (msg.includes("exist") || msg.includes("already") || msg.includes("registrado") || msg.includes("cadastro")) {
        setStep("exists");
      } else {
        setError(err.message || "Erro ao cadastrar");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.length < 4) {
      setError("Digite o código completo");
      return;
    }
    setLoading(true);
    try {
      const response = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (response?.access_token) {
        base44.auth.setToken(response.access_token);
        window.location.href = "/";
      } else {
        setError("Código inválido. Tente novamente.");
      }
    } catch (err) {
      setError(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await base44.auth.resendOtp(email);
    } catch (err) {
      setError("Erro ao reenviar código");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <AuthLayout
        icon={AlertCircle}
        title="Link inválido"
        subtitle="O link de cadastro não contém o email. Solicite um novo link ao administrador."
      >
        <Button variant="outline" className="w-full" onClick={() => window.location.href = "/login"}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Login
        </Button>
      </AuthLayout>
    );
  }

  // Step: OTP verification
  if (step === "otp") {
    return (
      <AuthLayout
        icon={Mail}
        title="Verifique seu email"
        subtitle={`Enviamos um código de verificação para ${email}`}
      >
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Código de verificação</Label>
            <div className="flex justify-center">
              <InputOTP
                value={otp}
                onChange={(val) => setOtp(val)}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar e Acessar"
            )}
          </Button>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            Não recebeu o código? Reenviar
          </button>
        </form>
      </AuthLayout>
    );
  }

  // Step: user already has an account
  if (step === "exists") {
    return (
      <AuthLayout
        icon={Mail}
        title="Conta já existe"
        subtitle={`Já existe uma conta cadastrada com ${email}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 text-blue-800 text-sm border border-blue-200">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Você já tem uma conta</p>
                <p className="text-xs opacity-75 mt-1">
                  Faça login com sua senha atual. Se esqueceu a senha, use a opção "Esqueceu a senha?" na tela de login para redefini-la.
                </p>
              </div>
            </div>
          </div>
          <Button className="w-full h-12 font-medium" onClick={() => window.location.href = "/login"}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir para o Login
          </Button>
          <button
            type="button"
            onClick={() => window.location.href = "/forgot-password"}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Step: set password
  return (
    <AuthLayout
      title="Defina sua senha"
      subtitle="Seu acesso foi aprovado! Crie uma senha para acessar o portal."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Fazer login
          </Link>
        </>
      }
    >
      <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-800 text-sm border border-green-200 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>Acesso aprovado para <strong>{email}</strong></span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSetPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Cadastrando...
            </>
          ) : (
            "Definar Senha e Continuar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}