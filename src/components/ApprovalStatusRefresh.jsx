import React, { useCallback, useEffect, useRef, useState } from 'react';
import { alliage } from '@/api/alliageClient';

// Read-only checks keep an already open waiting screen in sync with the admin's decision.
export default function ApprovalStatusRefresh({ onStatus }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    try {
      const user = await alliage.auth.me();
      if (!mounted.current) return;
      setError('');
      const status = user.authorization_status;
      if (status === 'approved') {
        window.location.assign('/');
      } else if (status === 'pending' || status === 'rejected') {
        onStatus(status);
      } else {
        setError('Não foi possível confirmar o status. Tente novamente.');
      }
    } catch (e) {
      if (mounted.current) setError(e.status === 401 ? 'Sua sessão expirou. Volte ao login para entrar novamente.' : 'Não foi possível consultar a liberação. Tente novamente.');
    } finally {
      busy.current = false;
      if (mounted.current) setChecking(false);
    }
  }, [onStatus]);

  useEffect(() => {
    mounted.current = true;
    const checkVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(checkVisible, 15000);
    window.addEventListener('focus', checkVisible);
    document.addEventListener('visibilitychange', checkVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', checkVisible);
      document.removeEventListener('visibilitychange', checkVisible);
    };
  }, [refresh]);

  return <div className="mb-4 space-y-2 text-center">
    <button type="button" onClick={refresh} disabled={checking} className="w-full rounded-xl border border-[#003B5C]/20 px-4 py-3 text-sm font-semibold text-[#003B5C] hover:bg-slate-50 disabled:opacity-50">
      {checking ? 'Verificando...' : 'Verificar liberação'}
    </button>
    <p className="text-xs text-slate-500">A liberação também é verificada automaticamente.</p>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
  </div>;
}
