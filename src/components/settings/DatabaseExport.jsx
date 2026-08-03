import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DatabaseExport() {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('exportDatabase', {});
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alliage-database-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <div className="card-modern p-6">
      <h2 className="text-lg font-semibold text-slate-900">Exportar banco de dados</h2>
      <p className="mt-1 mb-5 text-sm text-slate-500">Baixe todos os registros em JSON. Senhas, chaves e tokens internos não são incluídos.</p>
      <button onClick={download} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? 'Preparando...' : 'Baixar JSON'}
      </button>
    </div>
  );
}