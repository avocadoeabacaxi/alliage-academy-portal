import React, { useState } from 'react';
import { alliage } from '@/api/alliageClient';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function DeleteRequestModal({ request, onClose, onDeleted }) {
  const [value, setValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  if (!request) return null;
  const match = value.trim().toUpperCase() === (request.request_id || '').toUpperCase();

  const confirm = async () => {
    setDeleting(true);
    await alliage.entities.TrainingRequest.delete(request.id);
    setDeleting(false);
    onDeleted(request.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-[#003B5C]">Excluir solicitação</h2>
            <p className="text-sm text-slate-500 mt-0.5">Esta ação é permanente e não pode ser desfeita.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Solicitação</p>
            <p className="text-sm font-semibold text-[#00A6D6]">{request.request_id}</p>
            <p className="text-xs text-slate-500 truncate">{request.product_name} · {request.requester_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Digite o ID <span className="font-mono font-bold text-[#003B5C]">{request.request_id}</span> para confirmar
            </label>
            <input value={value} onChange={e => setValue(e.target.value)} className="input-base font-mono" placeholder={request.request_id} autoFocus />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors">Cancelar</button>
          <button
            onClick={confirm}
            disabled={!match || deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}