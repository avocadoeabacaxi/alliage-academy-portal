import { alliage } from '@/api/alliageClient';
import { supportTypes, trainingTypes } from '@/lib/requestTypeLabels';
import { BRAND_OPTIONS } from '@/components/ProductSelector';

const CATEGORIES = Object.keys(BRAND_OPTIONS);

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    ready: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['training', 'support'] },
        requester_name: { type: 'string' },
        requester_email: { type: 'string' },
        region: { type: 'string', enum: ['Brasil', 'LATAM', 'USA', 'ROW'] },
        region_detail: { type: 'string' },
        request_type: { type: 'string' },
        product_category: { type: 'string' },
        product_brand: { type: 'string' },
        training_focus: { type: 'string' },
        justification: { type: 'string' },
        participation_mode: { type: 'string', enum: ['Online', 'Presencial', 'Híbrido'] },
        location_country: { type: 'string' },
        location_city: { type: 'string' },
        deadline_requested: { type: 'string' },
        participants_count: { type: 'string', enum: ['1-5', '6-10', '11-20', '20+'] }
      }
    }
  },
  required: ['reply', 'ready', 'data']
};

const LANG_NAME = { pt: 'português', en: 'English', es: 'español' };

export async function askAssistant({ history, collected, lang, user }) {
  const prompt = `Você é a Lia, assistente virtual do Portal Alliage Academy, e conduz a abertura de solicitações de Treinamento ou Apoio Técnico por conversa. Se apresente como Lia quando fizer sentido.

Responda SEMPRE em ${LANG_NAME[lang] || 'português'}, de forma curta e amigável (máx. 2 frases + a próxima pergunta).

Regras:
- Faça UMA pergunta por vez, na ordem dos campos que ainda faltam.
- O usuário pode colar um texto grande com vários dados: extraia tudo o que der e só pergunte o que faltar.
- Nunca invente dados. Se o usuário não souber, use valores opcionais vazios.
- Campos obrigatórios: kind, requester_name, requester_email, region, request_type, product_category, training_focus, justification, participation_mode. Se participation_mode for Presencial ou Híbrido, também location_country e location_city.
- region_detail é o estado (Brasil) ou país (LATAM/ROW).
- Valores válidos de request_type para kind=training: ${trainingTypes.join(' | ')}.
- Valores válidos de request_type para kind=support: ${supportTypes.join(' | ')}.
- Valores válidos de product_category: ${CATEGORIES.join(' | ')}.
- Marcas válidas por categoria: ${JSON.stringify(BRAND_OPTIONS)}.
- Retorne em "data" SEMPRE o acumulado completo (dados já coletados + novos).
- Quando todos os obrigatórios estiverem preenchidos, defina ready=true e no "reply" faça um resumo curto pedindo confirmação ("posso abrir o chamado?"). Só mantenha ready=true depois que o usuário confirmar.

Usuário logado: ${user?.full_name || '—'} (${user?.email || '—'}).
Dados já coletados: ${JSON.stringify(collected)}
Conversa até agora:
${history.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n')}`;

  const res = await alliage.integrations.Core.InvokeLLM({ prompt, response_json_schema: RESPONSE_SCHEMA });
  return res;
}

export async function createRequestFromChat(data, lang) {
  const idResp = await alliage.functions.invoke('generateRequestId', {});
  const request_id = idResp.data.request_id;
  const brands = BRAND_OPTIONS[data.product_category] || [];
  const product = { category: data.product_category, brand: brands.length ? (data.product_brand || '') : '', brand_detail: '' };
  const productName = brands.length ? (data.product_brand || data.product_category) : data.product_category;
  const mode = data.participation_mode || 'Presencial';

  const created = await alliage.entities.TrainingRequest.create({
    request_id,
    request_category: 'Treinamento / Apoio Técnico',
    status: 'Pendente Análise',
    decision_stage1: 'Pendente',
    decision_stage2: 'Pendente',
    requester_name: data.requester_name,
    requester_email: data.requester_email,
    region: data.region,
    region_detail: data.region_detail || '',
    request_type: data.request_type,
    products: [product],
    product_category: data.product_category,
    product_name: productName,
    participants_count: data.participants_count || '6-10',
    guest_participation_mode: mode,
    format: mode === 'Online' ? 'Remoto' : mode,
    location_country: data.location_country || '',
    location_city: data.location_city || '',
    needs_deadline: !!data.deadline_requested,
    deadline_requested: data.deadline_requested || undefined,
    original_language: lang,
    training_focus: { [lang]: data.training_focus || '' },
    justification: { [lang]: data.justification || '' }
  });
  return { id: created.id, request_id };
}