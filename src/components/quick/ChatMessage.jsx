import React from 'react';

export default function ChatMessage({ role, content, time }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] px-3 pt-2 pb-5 text-[15px] leading-snug whitespace-pre-line shadow-sm ${
          isUser
            ? 'bg-[#D6F2FB] text-slate-800 rounded-2xl rounded-tr-sm'
            : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm'
        }`}
      >
        {content}
        <span className="absolute bottom-1 right-2.5 text-[10px] text-slate-400">{time}</span>
      </div>
    </div>
  );
}