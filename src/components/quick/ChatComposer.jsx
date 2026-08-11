import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatComposer({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    setText('');
    if (ref.current) ref.current.style.height = 'auto';
    onSend(value);
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 px-3 py-2.5 bg-[#F0F4F8] border-t border-slate-200"
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => { setText(e.target.value); resize(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
        rows={1}
        placeholder={placeholder}
        className="flex-1 resize-none bg-white rounded-3xl px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:border-[#00A6D6] shadow-sm"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-11 h-11 rounded-full bg-[#00A6D6] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 shadow-md"
      >
        {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </button>
    </form>
  );
}