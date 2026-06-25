import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Mail, FileText, Bell, AlertCircle, Loader2 } from 'lucide-react';

const TEMPLATES = [
  { id: 'admin_notification', label: 'Notificação ao Admin', type: 'admin_notification' },
  { id: 'approval', label: 'Email de Aprovação', type: 'approval' },
  { id: 'rejection', label: 'Email de Rejeição', type: 'rejection' },
  { id: 'training_reminder', label: 'Lembrete 1 Dia Antes', type: 'training_reminder' }
];

export default function Settings() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('admin_notification');
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await base44.entities.EmailTemplate.list();
      const templateMap = {};
      data.forEach(t => {
        templateMap[t.template_type] = t;
      });
      setTemplates(templateMap);
      
      const firstTemplate = data.find(t => t.template_type === selectedTemplate) || data[0];
      if (firstTemplate) {
        setEditSubject(firstTemplate.subject);
        setEditContent(firstTemplate.html_content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (type) => {
    setSelectedTemplate(type);
    const template = templates[type];
    if (template) {
      setEditSubject(template.subject);
      setEditContent(template.html_content);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editSubject.trim() || !editContent.trim()) return;
    
    setSaving(true);
    try {
      const existing = templates[selectedTemplate];
      if (existing) {
        await base44.entities.EmailTemplate.update(existing.id, {
          subject: editSubject,
          html_content: editContent
        });
      } else {
        await base44.entities.EmailTemplate.create({
          template_type: selectedTemplate,
          subject: editSubject,
          html_content: editContent
        });
      }
      await loadTemplates();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user?.role === 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold">Acesso negado. Apenas admins podem acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  const currentTemplate = TEMPLATES.find(t => t.type === selectedTemplate);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-[#003B5C] hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#003B5C]">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card-modern p-3 sticky top-4 space-y-2">
            {TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template.type)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  selectedTemplate === template.type
                    ? 'bg-[#00A6D6]/15 text-[#003B5C]'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{template.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          <div className="card-modern p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#003B5C] mb-1">{currentTemplate?.label}</h2>
              <p className="text-sm text-slate-500">Edite o template de email que será enviado automaticamente</p>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Assunto</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="input-base"
                  placeholder="Assunto do email"
                />
                <p className="text-xs text-slate-500 mt-1">Será usado como subject do email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Conteúdo HTML</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={15}
                  className="input-base resize-none font-mono text-xs"
                  placeholder="<div>...</div>"
                />
                <p className="text-xs text-slate-500 mt-1">Use HTML para formatar o email. Variáveis disponíveis: {`{requester_name}, {product_name}, {request_id}`}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving || !editSubject.trim() || !editContent.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#00A6D6] rounded-full hover:bg-[#0094BD] disabled:opacity-40 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Salvar Template
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Variáveis disponíveis:</p>
                <ul className="text-xs space-y-0.5 ml-4 list-disc">
                  <li>{'${requester_name}'} - Nome de quem solicitou</li>
                  <li>{'${requester_email}'} - Email de quem solicitou</li>
                  <li>{'${product_name}'} - Nome do produto</li>
                  <li>{'${request_id}'} - ID da solicitação</li>
                  <li>{'${training_scheduled_date}'} - Data agendada do treinamento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}