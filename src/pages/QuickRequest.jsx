import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { askAssistant, createRequestFromChat } from '@/lib/quickRequestAI';
import ChatMessage from '@/components/quick/ChatMessage';
import ChatComposer from '@/components/quick/ChatComposer';
import LanguageSelector from '@/components/LanguageSelector';
import { Loader2, CheckCircle2 } from 'lucide-react';

const LIA_AVATAR = 'https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/2fb3bbb24_CapturadeTela2026-08-11as092416.png';

const COPY = {
  pt: {
    title: 'Lia · Alliage Academy',
    status: 'online',
    placeholder: 'Mensagem',
    intro: 'Oi! Eu sou a Lia, sua assistente da Alliage Academy. 👋\nVou abrir sua solicitação em poucos passos. É um Treinamento ou um Apoio Técnico? Se preferir, cole aqui todas as informações que já tiver.',
    creating: 'Abrindo o chamado...',
    typing: 'digitando...',
    created: 'Chamado aberto com sucesso!',
    view: 'Ver solicitação',
    error: 'Não consegui abrir o chamado'
  },
  en: {
    title: 'Lia · Alliage Academy',
    status: 'online',
    placeholder: 'Message',
    intro: 'Hi! I\'m Lia, your Alliage Academy assistant. 👋\nI will open your request in a few steps. Is it a Training or Technical Support? You can also paste all the info you already have.',
    creating: 'Opening the ticket...',
    typing: 'typing...',
    created: 'Ticket opened successfully!',
    view: 'View request',
    error: 'Could not open the ticket'
  },
  es: {
    title: 'Lia · Alliage Academy',
    status: 'en línea',
    placeholder: 'Mensaje',
    intro: '¡Hola! Soy Lia, su asistente de Alliage Academy. 👋\nAbriré su solicitud en pocos pasos. ¿Es un Entrenamiento o un Soporte Técnico? También puede pegar aquí toda la información que ya tenga.',
    creating: 'Abriendo el ticket...',
    typing: 'escribiendo...',
    created: '¡Ticket abierto con éxito!',
    view: 'Ver solicitud',
    error: 'No pude abrir el ticket'
  }
};

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function QuickRequest() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.pt;
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [collected, setCollected] = useState({});
  const [thinking, setThinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking, creating]);

  // A saudação acompanha o idioma escolhido enquanto a conversa não começou
  useEffect(() => {
    setMessages((prev) => (prev.length <= 1 ? [{ role: 'assistant', content: copy.intro, time: now() }] : prev));
  }, [copy.intro]);

  const handleSend = async (text) => {
    const history = [...messages, { role: 'user', content: text, time: now() }];
    setMessages(history);
    setThinking(true);
    try {
      const res = await askAssistant({ history, collected, lang, user });
      const data = { ...collected, ...(res.data || {}) };
      setCollected(data);
      setMessages([...history, { role: 'assistant', content: res.reply, time: now() }]);
      if (res.ready) {
        setThinking(false);
        setCreating(true);
        const created = await createRequestFromChat(data, lang);
        setResult(created);
      }
    } catch (e) {
      setMessages([...history, { role: 'assistant', content: `${copy.error}: ${e.message}`, time: now() }]);
    } finally {
      setThinking(false);
      setCreating(false);
    }
  };

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-3 bg-[#F0F4F8]">
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
    <div className="flex flex-col h-[100dvh] bg-[#F0F4F8]">
      <header
        className="flex items-center gap-3 px-4 py-3 bg-[#003B5C] text-white shadow-md z-10"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <img src={LIA_AVATAR} alt="Lia" className="w-10 h-10 rounded-full object-cover object-top bg-white flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{copy.title}</p>
          <p className="text-[11px] text-white/70 truncate">{thinking ? copy.typing : copy.status}</p>
        </div>
        <LanguageSelector compact />
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        <div className="w-full max-w-2xl mx-auto space-y-2">
          {messages.map((m, i) => <ChatMessage key={i} role={m.role} content={m.content} time={m.time} />)}
          {(thinking || creating) && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#00A6D6]" />
              {creating ? copy.creating : copy.typing}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="w-full">
        <ChatComposer onSend={handleSend} disabled={thinking || creating} placeholder={copy.placeholder} />
      </div>
    </div>
  );
}