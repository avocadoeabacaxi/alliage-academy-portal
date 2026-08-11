import React, { useEffect, useState } from 'react';

export default function DirectoryForm({ fields, editing, onSave, labels }) {
  const empty = Object.fromEntries(fields.map((field) => [field.key, field.defaultValue || '']));
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onSave(form);
    if (saved) setForm(empty);
    setSaving(false);
  };
  return (
    <form onSubmit={submit} className="card-modern p-4 space-y-3">
      <h2 className="font-semibold text-[#003B5C]">{editing ? labels.edit : labels.add}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((field) => (
          <label key={field.key} className={field.wide ? 'sm:col-span-2 text-sm text-slate-600' : 'text-sm text-slate-600'}>
            {field.label}{field.required && ' *'}
            {field.options ? (
              <select value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="input-base mt-1" required={field.required}>
                <option value="">—</option>{field.options.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            ) : field.multiline ? (
              <textarea value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="input-base mt-1 resize-none" rows={3} required={field.required} />
            ) : <input type={field.type || 'text'} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="input-base mt-1" required={field.required} />}
          </label>
        ))}
      </div>
      <button disabled={saving} className="px-4 py-2 rounded-full bg-[#00A6D6] text-white text-sm font-semibold disabled:opacity-50">{saving ? labels.saving : labels.save}</button>
    </form>
  );
}