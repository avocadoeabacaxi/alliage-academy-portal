import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { askAssistant, createRequestFromChat } from '@/lib/quickRequestAI';
import ChatMessage from '@/components/quick/ChatMessage';
import ChatComposer from '@/components/quick/ChatComposer';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

const COPY = {
  pt: {
    title: 'Solicitação por chat',
    subtitle: 'Responda as perguntas ou cole seu texto — eu abro o chamado.',
    placeholder: 'Escreva ou cole as informações...',
    intro: 'Olá! Vou abrir sua solicitação em poucos passos. É um Treinamento ou um Apoio Técnico? Se preferir, cole aqui todas as informações que já tiver.',
    creating: 'Abrindo o chamado...',
    created: 'Chamado aberto com sucesso!',
    view: 'Ver solicitação',
    error: 'Não consegui abrir o chamado'
  },
  en: {
    title: 'Chat request',
    subtitle: 'Answer the questions or paste your text — I will open the ticket.',
    placeholder: 'Type or paste the information...',
    intro: 'Hi! I will open your request in a few steps. Is it a Training or Technical Support? You can also paste all the info you already have.',
    creating: 'Opening the ticket...',
    created: 'Ticket opened successfully!',
    view: 'View request',
    error: 'Could not open the ticket'
  },
  es: {
    title: 'Solicitud por chat',
    subtitle: 'Responda las preguntas o pegue su texto — yo abro el ticket.',
    placeholder: 'Escriba o pegue la información...',
    intro: '¡Hola! Abriré su solicitud en pocos pasos. ¿Es un Entrenamiento o un Soporte Técnico? También puede pegar aquí toda la información que ya tenga.',
    creating: 'Abriendo el ticket...',
    created: '¡Ticket abierto con éxito!',
    view: 'Ver solicitud',
    error: 'No pude abrir el ticket'
  }
};

export default function QuickRequest() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.pt;
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([{ role: 'assistant', content: copy.intro }]);
  const [collected, setCollected] = useState({});
  const [thinking, setThinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  const handleSend = async (text) => {
    const history = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setThinking(true);
    try {
      const res = await askAssistant({ history, collected, lang, user });
      const data = { ...collected, ...(res.data || {}) };
      setCollected(data);
      setMessages([...history, { role: 'assistant', content: res.reply }]);
      if (res.ready) {
        setThinking(false);
        setCreating(true);
        const created = await createRequestFromChat(data, lang);
        setResult(created);
      }
    } catch (e) {
      setMessages([...history, { role: 'assistant', content: `${copy.error}: ${e.message}` }]);
    } finally {
      setThinking(false);
      setCreating(false);
    }
  };

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
        <CheckCircle2 className="w-14 h-14 text-green-600" />
        <h2 className="text-lg font-bold text-[#003B5C]">{copy.created}</h2>
        <p className="text-sm font-mono text-slate-500">{result.request_id}</p>
        <button onClick={() => navigate(`/requests/${result.id}`)} className="mt-2 px-5 py-2.5 rounded-full bg-[#00A6D6] text-white text-sm font-semibold">
          {copy.view}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <h1 className="text-base font-bold text-[#003B5C] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00A6D6]" />
          {copy.title}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">{copy.subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => <ChatMessage key={i} role={m.role} content={m.content} />)}
        {(thinking || creating) && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#00A6D6]" />
            {creating ? copy.creating : '...'}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer onSend={handleSend} disabled={thinking || creating} placeholder={copy.placeholder} />
    </div>
  );
}