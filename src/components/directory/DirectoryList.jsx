import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function DirectoryList({ records, primaryKey, secondaryKeys, onEdit, onDelete, labels, isAdmin }) {
  if (!records.length) return <div className="card-modern p-8 text-center text-sm text-slate-400">{labels.empty}</div>;
  return (
    <div className="card-modern overflow-hidden divide-y divide-slate-100">
      {records.map((record) => (
        <div key={record.id} className="flex items-center gap-3 p-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{record[primaryKey]}</p>
            <p className="text-xs text-slate-500 truncate">{secondaryKeys.map((key) => record[key]).filter(Boolean).join(' · ') || '—'}</p>
            {isAdmin && <p className="text-[11px] text-[#00A6D6] mt-1">{labels.owner}: {record.owner_name || '—'}</p>}
          </div>
          <button onClick={() => onEdit(record)} className="p-2 text-slate-400 hover:text-[#00A6D6]" aria-label={labels.edit}><Pencil className="w-4 h-4" /></button>
          <button onClick={() => onDelete(record)} className="p-2 text-slate-400 hover:text-red-500" aria-label={labels.delete}><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}