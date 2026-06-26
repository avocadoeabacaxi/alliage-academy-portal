import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, AlertCircle, Loader2 } from 'lucide-react';

const DEFAULT_TEMPLATES = {
  admin_notification: {
    subject: '[${priority}] Nova Solicitação - ${request_id}',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><h2 style="color: #003B5C; margin-top: 0; font-size: 24px;">Nova Solicitação de Treinamento</h2><p style="color: #6B7280; line-height: 1.6;">Uma nova solicitação foi recebida e aguarda sua análise.</p><div style="background: #F3F4F6; border-left: 4px solid #00A6D6; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>ID:</strong> ${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Solicitante:</strong> ${requester_name}</p><p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${requester_email}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> ${product_name}</p><p style="margin: 8px 0; color: #374151;"><strong>Prioridade:</strong> ${priority}</p></div><a href="${origin}/requests/${request_id}" style="display: inline-block; padding: 12px 24px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">Revisar Solicitação</a><hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;"><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Você recebeu este email porque é administrador do Alliage Academy.</p></div></div>'
  },
  approval: {
    subject: '✅ Sua Solicitação foi Aprovada - ${request_id}',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; background: #DBEAFE; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 32px;">✅</div></div><h2 style="color: #003B5C; margin-top: 0; text-align: center; font-size: 24px;">Sua Solicitação foi Aprovada!</h2><p style="color: #6B7280; line-height: 1.6; text-align: center;">Olá ${requester_name}, temos o prazer de informar que sua solicitação foi aprovada.</p><div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>Solicitação:</strong> ${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> ${product_name}</p><p style="margin: 8px 0; color: #374151;"><strong>Educador:</strong> ${educator_name}</p><p style="margin: 8px 0; color: #374151;"><strong>Data:</strong> ${training_scheduled_date}</p></div><p style="color: #6B7280; line-height: 1.6;">Em breve você receberá mais detalhes sobre o treinamento. Fique atento aos seus emails!</p><hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;"><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Dúvidas? Entre em contato com a equipe de treinamento.</p></div></div>'
  },
  rejection: {
    subject: '❌ Solicitação Não Aprovada - ${request_id}',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><h2 style="color: #003B5C; margin-top: 0; font-size: 24px;">Informação sobre sua Solicitação</h2><p style="color: #6B7280; line-height: 1.6;">Olá ${requester_name},</p><div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>Solicitação:</strong> ${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> ${product_name}</p><p style="margin: 8px 0; color: #374151;"><strong>Motivo:</strong> A solicitação não foi aprovada neste momento.</p></div><p style="color: #6B7280; line-height: 1.6;">Você pode submeter uma nova solicitação com informações atualizadas a qualquer momento.</p><hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;"><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Dúvidas? Entre em contato conosco.</p></div></div>'
  },
  training_reminder: {
    subject: '📅 Lembrete: Seu Treinamento é Amanhã!',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; background: #FEF3C7; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 32px;">📅</div></div><h2 style="color: #003B5C; margin-top: 0; text-align: center; font-size: 24px;">Seu Treinamento é Amanhã!</h2><p style="color: #6B7280; line-height: 1.6; text-align: center;">Olá ${requester_name}, este é um lembrete de que você tem um treinamento agendado para <strong>amanhã</strong>!</p><div style="background: #F3F4F6; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>Solicitação:</strong> ${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> ${product_name}</p><p style="margin: 8px 0; color: #374151;"><strong>Data e Hora:</strong> ${training_scheduled_date}</p><p style="margin: 8px 0; color: #374151;"><strong>Formato:</strong> ${format}</p></div><p style="color: #EF4444; font-weight: bold; text-align: center; margin: 20px 0;">Por favor, confirme sua presença e chegue com antecedência!</p><hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;"><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Dúvidas? Entre em contato conosco.</p></div></div>'
  },
  survey: {
    subject: '📋 Pesquisa de Satisfação - Treinamento ${request_id}',
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; background: #DBEAFE; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 32px;">📋</div></div><h2 style="color: #003B5C; margin-top: 0; text-align: center; font-size: 24px;">Pesquisa de Satisfação</h2><p style="color: #6B7280; line-height: 1.6; text-align: center;">Olá ${requester_name}, obrigado por participar do nosso treinamento!</p><div style="background: #F3F4F6; border-left: 4px solid #00A6D6; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>Solicitação:</strong> ${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> ${product_name}</p></div><p style="color: #6B7280; line-height: 1.6;">Gostaríamos de saber sua opinião sobre o treinamento que você participou. Sua resposta nos ajuda a melhorar continuamente nossos programas.</p><div style="margin: 30px 0; text-align: center;"><a href="${survey_url}" style="display: inline-block; padding: 12px 32px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">Responder Pesquisa</a></div><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Esta pesquisa é confidencial e seus dados serão usados apenas para melhorias no programa.</p></div></div>'
  }
};

const TEMPLATES = [
  { id: 'admin_notification', label: 'Notificação ao Admin', type: 'admin_notification' },
  { id: 'approval', label: 'Email de Aprovação', type: 'approval' },
  { id: 'rejection', label: 'Email de Rejeição', type: 'rejection' },
  { id: 'training_reminder', label: 'Lembrete 1 Dia Antes', type: 'training_reminder' },
  { id: 'survey', label: 'Pesquisa de Satisfação', type: 'survey' }
];

export default function EmailTemplates() {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('admin_notification');
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await base44.entities.EmailTemplate.list();
      const templateMap = {};
      data.forEach(t => {
        templateMap[t.template_type] = t;
      });
      
      // Initialize missing templates with defaults
      for (const [type, defaultTpl] of Object.entries(DEFAULT_TEMPLATES)) {
        if (!templateMap[type]) {
          const created = await base44.entities.EmailTemplate.create({
            template_type: type,
            subject: defaultTpl.subject,
            html_content: defaultTpl.html
          });
          templateMap[type] = created;
        }
      }
      
      setTemplates(templateMap);
      const firstTemplate = templateMap[selectedTemplate];
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
      }
      await loadTemplates();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  const currentTemplate = TEMPLATES.find(t => t.type === selectedTemplate);

  return (
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
                <li>${'{requester_name}'} - Nome de quem solicitou</li>
                <li>${'{requester_email}'} - Email de quem solicitou</li>
                <li>${'{product_name}'} - Nome do produto</li>
                <li>${'{request_id}'} - ID da solicitação</li>
                <li>${'{priority}'} - Prioridade</li>
                <li>${'{educator_name}'} - Nome do educador</li>
                <li>${'{training_scheduled_date}'} - Data do treinamento</li>
                <li>${'{format}'} - Formato (Remoto/Presencial)</li>
                <li>${'{survey_url}'} - Link da pesquisa (apenas template de pesquisa)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}