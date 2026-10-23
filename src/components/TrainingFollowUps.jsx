import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { alliage } from '@/api/alliageClient';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { followUpCopy } from '@/lib/i18n/supportAndFollowUp';

export default function TrainingFollowUps({ request }) {
  const { lang } = useLanguage();
  const c = followUpCopy(lang);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const submission = useRef(null);
  const busy = useRef(false);
  const canAdd = !['Cancelado', 'Rejeitado'].includes(request.status)
    && Boolean(request.status === 'Concluído' || request.training_completed_date);

  const load = async (before = '') => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await alliage.trainingFollowUps.list(request.id, before);
      setItems(previous => before ? [...previous, ...result.items.filter(item => !previous.some(old => old.id === item.id))] : result.items);
      setCursor(result.next_cursor);
    } catch (err) { setLoadError(err.message || c.error); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [request.id]);

  const submit = async event => {
    event.preventDefault();
    const text = comment.trim();
    if (busy.current || !canAdd || !text || text.length > 5000) return;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    setSaved(false);
    // Keep the key across a network failure; changing the text starts a new submission.
    if (submission.current?.comment !== text) submission.current = { comment: text, submission_id: crypto.randomUUID() };
    try {
      const entry = await alliage.trainingFollowUps.create(request.id, submission.current);
      setItems(previous => [entry, ...previous.filter(item => item.id !== entry.id)]);
      setComment('');
      submission.current = null;
      setSaved(true);
    } catch (err) { setSaveError(err.message); } finally { busy.current = false; setSaving(false); }
  };

  return <section className="card-modern p-4 mb-3" aria-labelledby="follow-up-title">
    <h2 id="follow-up-title" className="flex items-center gap-2 text-sm font-semibold text-[#003B5C]"><MessageSquarePlus className="w-5 h-5 text-[#00A6D6]" />{c.title}</h2>
    <p className="text-sm text-slate-500 mt-2">{c.intro}</p>
    {canAdd ? <form onSubmit={submit} className="space-y-2 my-4">
      <label htmlFor="follow-up-comment" className="block text-sm font-medium text-slate-700">{c.label}</label>
      <textarea id="follow-up-comment" value={comment} disabled={saving} onChange={e => { setComment(e.target.value); setSaved(false); }} maxLength={5000} rows={4} placeholder={c.placeholder} className="input-base" required />
      <p className="text-xs text-slate-500">{comment.length}/5000 · {c.immutable}</p>
      <button type="submit" disabled={saving || loading || !comment.trim()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#003B5C] rounded-lg disabled:opacity-40">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{c.save}</button>
      {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700">{c.saved}</p>}
    </form> : <p className="my-4 text-sm text-slate-500">{c.pending}</p>}
    {loadError && <div role="alert" className="my-3 text-sm text-red-700">{loadError} <button type="button" className="underline" onClick={() => load(cursor || '')}>{c.retry}</button></div>}
    {loading && <Loader2 aria-label="Loading" className="my-4 w-5 h-5 animate-spin text-[#00A6D6]" />}
    {!loading && !loadError && items.length === 0 && <p className="text-sm text-slate-500">{c.empty}</p>}
    <ol className="space-y-3 mt-3">{items.map(item => <li key={item.id} className="border border-slate-200 bg-slate-50 rounded-xl p-3">
      <div className="flex flex-wrap justify-between gap-1 text-xs text-slate-500"><span><strong className="text-slate-800">{item.author_name}</strong> · {item.author_email}</span><time dateTime={item.created_date}>{new Date(item.created_date).toLocaleString(lang === 'pt' ? 'pt-BR' : lang, { dateStyle: 'short', timeStyle: 'short' })}</time></div>
      <p className="text-sm text-slate-800 whitespace-pre-wrap break-words mt-2">{item.comment}</p>
    </li>)}</ol>
    {cursor && <button type="button" disabled={loading || saving} onClick={() => load(cursor)} className="mt-3 text-sm text-[#007a9e] underline disabled:opacity-40">{c.more}</button>}
  </section>;
}
