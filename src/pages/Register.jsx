import React, { useState } from "react";
import { Link } from "react-router-dom";
import { alliage } from "@/api/alliageClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import RegistrationProfileFields from "@/components/RegistrationProfileFields";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const emptyProfile = { full_name: "", email: "", phone: "" };

export default function Register() {
  const { lang } = useLanguage();
  const [profile, setProfile] = useState(emptyProfile);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const validateProfile = () => {
    if (!profile.full_name || !profile.email || !profile.phone) {
      setError("Preencha todos os dados pessoais.");
      return false;
    }
    return true;
  };

  const requestApproval = async () => {
    const response = await alliage.functions.invoke("requestAccess", { ...profile, preferred_language: lang });
    if (!response.data?.success && response.data?.status !== "pending") {
      throw new Error(response.data?.message || "Não foi possível solicitar o acesso");
    }
  };

  const handlePasswordRegister = async (event) => {
    event.preventDefault();
    setError("");
    if (!validateProfile()) return;
    if (password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não coincidem.");
    setLoading("password");
    try {
      await requestApproval();
      await alliage.auth.register({ email: profile.email.trim().toLowerCase(), password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "Erro ao realizar cadastro");
    } finally {
      setLoading("");
    }
  };

  const handleSocial = async (provider) => {
    setError("");
    if (!validateProfile()) return;
    setLoading(provider);
    try {
      await requestApproval();
      alliage.auth.loginWithProvider(provider, "/");
    } catch (err) {
      setError(err.message || "Erro ao solicitar acesso");
      setLoading("");
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setLoading("otp");
    try {
      const response = await alliage.auth.verifyOtp({ email: profile.email.trim().toLowerCase(), otpCode: otp });
      if (!response?.access_token) throw new Error("Código inválido");
      alliage.auth.setToken(response.access_token);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Código inválido");
      setLoading("");
    }
  };

  if (step === "otp") {
    return (
      <AuthLayout icon={Mail} title="Verifique seu email" subtitle={`Enviamos um código para ${profile.email}`}>
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {error && <ErrorMessage message={error} />}
          <div className="flex justify-center">
            <InputOTP value={otp} onChange={setOtp} maxLength={6}>
              <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading === "otp" || otp.length < 6}>
            {loading === "otp" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Verificar e continuar
          </Button>
          <button type="button" onClick={() => alliage.auth.resendOtp(profile.email)} className="w-full text-sm text-primary hover:underline">Reenviar código</button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar cadastro" subtitle="Preencha seus dados. O acesso depende da aprovação do administrador." footer={<>Já tem uma conta? <Link to="/login" className="text-[#00A6D6] font-semibold hover:underline">Fazer login</Link></>}>
      {error && <ErrorMessage message={error} />}
      <Button type="button" variant="outline" className="w-full h-12" disabled={!!loading} onClick={() => handleSocial("google")}><GoogleIcon className="w-5 h-5 mr-2" />Google</Button>
      <p className="mt-3 text-xs text-center text-muted-foreground">Preencha os dados abaixo e use no Google o mesmo email informado.</p>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">ou cadastre-se com senha</span></div>
      </div>
      <form onSubmit={handlePasswordRegister} className="space-y-4">
        <RegistrationProfileFields profile={profile} onChange={setProfile} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PasswordField id="password" label="Senha" value={password} onChange={setPassword} />
          <PasswordField id="confirm" label="Confirmar senha" value={confirmPassword} onChange={setConfirmPassword} />
        </div>
        <Button type="submit" className="w-full h-12" disabled={!!loading}>
          {loading === "password" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar conta com senha
        </Button>
      </form>
    </AuthLayout>
  );
}

function PasswordField({ id, label, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id={id} type="password" value={value} onChange={(e) => onChange(e.target.value)} className="pl-10 h-12" placeholder="Mínimo 6 caracteres" required />
      </div>
    </div>
  );
}

function ErrorMessage({ message }) {
  return <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{message}</div>;
}
