import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#00A6D6] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] px-3.5 py-2.5 text-sm whitespace-pre-line rounded-2xl ${isUser ? 'bg-[#003B5C] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
        {content}
      </div>
    </div>
  );
}