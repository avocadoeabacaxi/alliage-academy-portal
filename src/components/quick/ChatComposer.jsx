import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatComposer({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    setText('');
    onSend(value);
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2 p-3 bg-white border-t border-slate-200">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
        rows={1}
        placeholder={placeholder}
        className="input-base resize-none max-h-32 flex-1"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-11 h-11 rounded-full bg-[#00A6D6] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
      >
        {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </button>
    </form>
  );
}