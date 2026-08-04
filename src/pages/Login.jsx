import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, AlertCircle, Clock, GraduationCap, ArrowRight, CheckCircle2, Users, BookOpen, BarChart3 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Login() {
  const { t } = useLanguage();
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
        window.location.href = "/";
      } else {
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
      await checkAuthStatus();
    } catch (err) {
      setError(err.message || t('login.invalid'));
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  const handleMicrosoft = () => {
    base44.auth.loginWithProvider("microsoft", "/");
  };

  const handleLogout = () => {
    base44.auth.logout();
    setIsLoggedIn(false);
    setAuthStatus(null);
    setEmail("");
    setPassword("");
  };

  // Tela de espera / rejeição — tela cheia
  if (isLoggedIn && (authStatus === 'pending' || authStatus === 'rejected')) {
    const isPending = authStatus === 'pending';
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #003B5C 0%, #00547A 50%, #00A6D6 100%)' }}>
        <div className="absolute right-4 top-4 z-20"><LanguageSelector compact /></div>
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#00A6D6]/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img
              src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/3f49984b2_logotraininnniinin.png"
              alt="Alliage Training & Education"
              className="h-16 w-auto"
            />
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className={`h-2 ${isPending ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className="p-8 sm:p-10">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 ${isPending ? 'bg-amber-50' : 'bg-red-50'}`}>
                  {isPending ? <Clock className="w-10 h-10 text-amber-500" /> : <AlertCircle className="w-10 h-10 text-red-500" />}
                </div>
                <h1 className="text-2xl font-bold text-[#003B5C] mb-2">
                  {isPending ? t('login.pendingTitle') : t('login.rejectedTitle')}
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 px-2">
                  {isPending ? t('login.pendingDesc') : t('login.rejectedDesc')}
                </p>
              </div>

              {email && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-500 truncate">{email}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl bg-[#003B5C] hover:bg-[#002D44] transition-colors shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                {t('login.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login — split layout
  return (
    <div className="min-h-screen flex">
      <div className="fixed right-4 top-4 z-20 rounded-xl bg-[#003B5C] shadow-lg"><LanguageSelector compact /></div>
      {/* Lado esquerdo — branding / info do portal */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, #003B5C 0%, #00547A 60%, #00A6D6 100%)' }}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#00A6D6]/10 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-2 h-2 rounded-full bg-white/30" />
        <div className="absolute top-1/2 right-20 w-1 h-1 rounded-full bg-white/20" />
        <div className="absolute bottom-1/3 left-10 w-1.5 h-1.5 rounded-full bg-white/25" />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/3f49984b2_logotraininnniinin.png"
            alt="Alliage Training & Education"
            className="h-14 w-auto"
          />
        </div>

        {/* Headline + features */}
        <div className="relative z-10">
          <h1 className="text-white font-bold text-4xl leading-tight mb-4">{t('login.portalTitle')}</h1>
          <p className="text-white/70 text-sm leading-relaxed mb-10 max-w-md">{t('login.portalDesc')}</p>

          <div className="space-y-4">
            {[
              { icon: BookOpen, title: t('login.featureRequests'), desc: t('login.featureRequestsDesc') },
              { icon: Users, title: t('login.featureRegions'), desc: t('login.featureRegionsDesc') },
              { icon: BarChart3, title: t('login.featureMetrics'), desc: t('login.featureMetricsDesc') },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-[#00A6D6]" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{feature.title}</p>
                  <p className="text-white/50 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2 text-white/40 text-xs">
          <CheckCircle2 className="w-3 h-3" />
          {t('login.certified')} · © {new Date().getFullYear()} Alliage
        </div>
      </div>

      {/* Lado direito — formulário de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src="https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/3f49984b2_logotraininnniinin.png"
              alt="Alliage Training & Education"
              className="h-12 w-auto"
            />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#003B5C] mb-1">{t('login.welcome')}</h1>
            <p className="text-slate-500 text-sm">{t('login.subtitle')}</p>
          </div>

          <Button
            variant="outline"
            className="w-full h-11 text-sm font-medium mb-4 border-slate-200 hover:bg-slate-50"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            {t('login.google')}
          </Button>

          <Button
            variant="outline"
            className="w-full h-11 text-sm font-medium mb-4 border-slate-200 hover:bg-slate-50"
            onClick={handleMicrosoft}
          >
            <LogIn className="w-5 h-5 mr-2 text-[#0078D4]" />
            {t('login.microsoft')}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">{t('login.or')}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-600">{t('login.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-slate-200 focus:border-[#00A6D6] focus:ring-[#00A6D6]/20"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-slate-600">{t('login.password')}</Label>
                <Link to="/forgot-password" className="text-xs text-[#00A6D6] hover:underline font-medium">
                  {t('login.forgot')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 border-slate-200 focus:border-[#00A6D6] focus:ring-[#00A6D6]/20"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-medium text-sm shadow-lg"
              style={{ background: 'linear-gradient(135deg, #003B5C, #00A6D6)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('login.loading')}
                </>
              ) : (
                <>
                  {t('login.submit')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-[#00A6D6] hover:underline">{t('login.requestAccess')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}