import React, { useId } from 'react';
import { hasOther } from '@/lib/otherOptions';

export default function OtherOptionDetails({ selection, value = '', onChange, label, disabled = false }) {
  const id = useId();
  if (!hasOther(selection)) return null;
  return <div className="mt-3">
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{label} <span className="text-red-500">*</span></label>
    <textarea id={id} required disabled={disabled} rows={2} maxLength={2000} value={value}
      onChange={event => onChange(event.target.value)} placeholder={label}
      className="input-base resize-y disabled:bg-slate-50" />
  </div>;
}
