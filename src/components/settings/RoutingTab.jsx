import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Info } from 'lucide-react';

// Raio-x de tudo que existe no formulário
const TRAINING_TYPES = [
  'Novo treinamento', 'Reciclagem', 'Atualização de produto', 'Treinamento de lançamento',
  'Técnico avançado', 'Treinamento clínico', 'Apoio técnico', 'Consulta de mercado',
  'Licitação', 'Modificação de produto', 'Treinamento de integração', 'Outro'
];

const PRODUCT_CATEGORIES = [
  'Extraoral', 'Scanner Intraoral', 'Software', 'Consultórios', 'Raios X',
  'Raios X portátil', 'Sensor intraoral', 'Periféricos', 'Eagle PS', 'Peças de mão', 'Outro'
];

const ALL_PRODUCTS = '*';

// Dev — nunca aparece como responsável de roteamento (não recebe solicitações)
const EXCLUDED_EMAILS = ['fernando@avocado.buzz'];
// Aprovador final da 2ª etapa — sempre recebe o pedido final
const FINAL_APPROVER_EMAIL = 'caio.monteiro@alliage-global.com';

export default function RoutingTab() {
  const [rules, setRules] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesData, adminsResp] = await Promise.all([
        base44.entities.RoutingRule.list('', 500),
        base44.functions.invoke('listUserAuthorizations', {}),
      ]);
      setRules(rulesData || []);
      const auths = adminsResp.data?.data || [];
      const adminEmails = auths
        .filter(a => a.role === 'admin' && a.status === 'approved' && !EXCLUDED_EMAILS.includes(a.email))
        .map(a => ({ email: a.email, name: a.full_name || a.email.split('@')[0] }));
      setAdmins(adminEmails);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const findRule = (type, category) =>
    rules.find(r => r.request_type === type && (r.product_category || ALL_PRODUCTS) === category);

  const getRecipients = (type, category) => {
    const rule = findRule(type, category);
    return rule?.recipient_emails || [];
  };

  const toggleRecipient = async (type, category, email) => {
    const key = `${type}|${category}`;
    setSaving(key);
    try {
      const existing = findRule(type, category);
      const current = existing?.recipient_emails || [];
      const next = current.includes(email) ? current.filter(e => e !== email) : [...current, email];

      if (existing) {
        await base44.entities.RoutingRule.update(existing.id, { recipient_emails: next });
        setRules(prev => prev.map(r => r.id === existing.id ? { ...r, recipient_emails: next } : r));
      } else {
        const created = await base44.entities.RoutingRule.create({
          request_type: type,
          product_category: category,
          recipient_emails: next,
        });
        setRules(prev => [...prev, created]);
      }
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-4 border-[#00A6D6]/20 border-t-[#00A6D6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 text-sm text-slate-600 bg-[#00A6D6]/5 border border-[#00A6D6]/15 rounded-lg p-4">
        <Info className="w-4 h-4 text-[#00A6D6] flex-shrink-0 mt-0.5" />
        <p>
          Defina quem recebe a notificação de novas solicitações para cada <strong>tipo de solicitação</strong> e <strong>produto</strong>.
          Marque um ou mais responsáveis. Combinações sem responsável definido notificam <strong>todos os admins</strong>.
          O aprovador final da 2ª etapa recebe <strong>todas</strong> as solicitações automaticamente.
        </p>
      </div>

      {admins.length === 0 && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Nenhum admin aprovado encontrado para atribuir.
        </div>
      )}

      {/* Solicitação de Evento (categoria única) */}
      <RoutingSection
        title="Solicitação de Evento"
        subtitle="Notificações para novas solicitações de evento"
        rows={[{ type: 'Evento', category: ALL_PRODUCTS, label: 'Todos os eventos' }]}
        admins={admins}
        getRecipients={getRecipients}
        toggleRecipient={toggleRecipient}
        saving={saving}
      />

      {/* Treinamento / Apoio Técnico: tipo x produto */}
      {TRAINING_TYPES.map(type => (
        <RoutingSection
          key={type}
          title={type}
          subtitle="Por categoria de produto"
          rows={[
            { type, category: ALL_PRODUCTS, label: 'Todos os produtos' },
            ...PRODUCT_CATEGORIES.map(cat => ({ type, category: cat, label: cat })),
          ]}
          admins={admins}
          getRecipients={getRecipients}
          toggleRecipient={toggleRecipient}
          saving={saving}
        />
      ))}
    </div>
  );
}

function RoutingSection({ title, subtitle, rows, admins, getRecipients, toggleRecipient, saving }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-modern overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <h3 className="font-semibold text-[#003B5C]">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {rows.map(row => {
            const key = `${row.type}|${row.category}`;
            const recipients = getRecipients(row.type, row.category);
            return (
              <div key={key} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${row.category === '*' ? 'text-[#00A6D6]' : 'text-slate-700'}`}>
                    {row.label}
                  </span>
                  {saving === key && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {admins.map(admin => {
                    const selected = recipients.includes(admin.email);
                    return (
                      <button
                        key={admin.email}
                        onClick={() => toggleRecipient(row.type, row.category, admin.email)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          selected
                            ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        title={admin.email}
                      >
                        {admin.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}