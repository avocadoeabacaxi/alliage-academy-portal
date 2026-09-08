import { config } from './config.mjs';

const fallbackQuestions = [
  { id: 'overall', type: 'rating', text: { pt: 'Qual é sua satisfação geral com a atividade?', en: 'How satisfied are you with the activity overall?', es: '¿Cuál es su satisfacción general con la actividad?' } },
  { id: 'content', type: 'rating', text: { pt: 'Como você avalia a qualidade do conteúdo apresentado?', en: 'How do you rate the quality of the content presented?', es: '¿Cómo evalúa la calidad del contenido presentado?' } },
  { id: 'educator', type: 'rating', text: { pt: 'Como você avalia a clareza e a atuação do educador?', en: 'How do you rate the educator’s clarity and delivery?', es: '¿Cómo evalúa la claridad y el desempeño del educador?' } },
  { id: 'application', type: 'rating', text: { pt: 'O conteúdo é aplicável à sua rotina profissional?', en: 'Is the content applicable to your professional routine?', es: '¿El contenido es aplicable a su rutina profesional?' } },
  { id: 'knowledge', type: 'rating', text: { pt: 'A atividade aumentou seu conhecimento sobre o tema?', en: 'Did the activity improve your knowledge of the subject?', es: '¿La actividad aumentó su conocimiento sobre el tema?' } },
  { id: 'suggestions', type: 'text', text: { pt: 'Que sugestões você daria para melhorarmos?', en: 'What suggestions do you have for improvement?', es: '¿Qué sugerencias tiene para mejorar?' } },
];

function extractJson(content) {
  if (typeof content !== 'string') return content;
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export async function generateJson(prompt) {
  if (!config.aiApiUrl || !config.aiApiKey || !config.aiModel) return null;
  const response = await fetch(`${config.aiApiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.aiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.aiModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON. Do not include Markdown.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const result = await response.json();
  return extractJson(result.choices?.[0]?.message?.content);
}

export async function translateTexts(texts, sourceLanguage) {
  const fieldNames = Object.keys(texts || {});
  if (fieldNames.length === 0) return {};
  const fallback = Object.fromEntries(fieldNames.map(field => [field, { pt: String(texts[field] ?? ''), en: String(texts[field] ?? ''), es: String(texts[field] ?? '') }]));
  try {
    return await generateJson(`Translate these Alliage medical-device texts from ${sourceLanguage || 'the detected language'} into Portuguese, English and Spanish. Preserve product names and technical terms. Return an object keyed by the original field names, where each value is {"pt":"...","en":"...","es":"..."}.\n\n${JSON.stringify(texts)}`) || fallback;
  } catch (error) {
    console.error('AI translation fallback:', error.message);
    return fallback;
  }
}

export async function generateSurveyQuestions(request = {}) {
  const focus = typeof request.training_focus === 'object'
    ? request.training_focus.pt || request.training_focus.en || request.training_focus.es || ''
    : request.training_focus || '';
  try {
    const result = await generateJson(`Create a 6-8 question satisfaction survey for an Alliage medical-device corporate training. Include overall satisfaction, content quality, educator effectiveness, practical application, knowledge improvement and one open suggestion. Every question needs id, type (rating or text), and text in pt/en/es. Return {"questions": [...]}.
Training type: ${request.request_type || '—'}
Product: ${request.product_name || '—'}
Training focus: ${focus}`);
    return Array.isArray(result?.questions) && result.questions.length ? result.questions : fallbackQuestions;
  } catch (error) {
    console.error('AI survey fallback:', error.message);
    return fallbackQuestions;
  }
}

export function evaluationQuestions(productName = 'treinamento') {
  return [
    { id: 'q1', category: 'content', text: `Como você avalia o conteúdo sobre ${productName}?`, type: 'scale', scale: 5 },
    { id: 'q2', category: 'educator', text: 'Como você avalia a clareza do educador?', type: 'scale', scale: 5 },
    { id: 'q3', category: 'relevance', text: 'O conteúdo é relevante para sua atividade profissional?', type: 'scale', scale: 5 },
    { id: 'nps', category: 'nps', text: 'Em uma escala de 0-10, o quanto você recomendaria este treinamento?', type: 'nps', scale: 10 },
    { id: 'feedback', category: 'general', text: 'Qual foi o seu maior aprendizado neste treinamento?', type: 'text' },
  ];
}

