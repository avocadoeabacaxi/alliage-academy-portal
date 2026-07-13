import React from 'react';

const STATUS_CONFIG = {
  'Pendente Análise': { key: 'pendente', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'Aprovado Etapa 1': { key: 'aprovado1', classes: 'bg-[#00A6D6]/10 text-[#003B5C] border-[#00A6D6]/20', dot: 'bg-[#00A6D6]' },
  'Aprovado Etapa 2': { key: 'aprovado2', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Concluído': { key: 'concluido', classes: 'bg-green-50 text-green-800 border-green-300', dot: 'bg-green-600' },
  'Rejeitado': { key: 'rejeitado', classes: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' }
};

const PRIORITY_CONFIG = {
  'Baixa': 'bg-slate-100 text-slate-600',
  'Média': 'bg-yellow-100 text-yellow-700',
  'Alta': 'bg-orange-100 text-orange-700',
  'Crítica': 'bg-red-100 text-red-700'
};

export function StatusBadge({ status, t }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Pendente Análise'];
  const label = t ? t(`status.${config.key}`) : status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}

const PRIORITY_KEYS = { 'Baixa': 'baixa', 'Média': 'media', 'Alta': 'alta', 'Crítica': 'critica' };

export function PriorityBadge({ priority, t }) {
  const p = priority || 'Média';
  const label = t ? t(`priority.${PRIORITY_KEYS[p] || 'media'}`) : p;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Média']}`}>
      {label}
    </span>
  );
}