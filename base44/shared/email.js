export const EMAIL_FROM = 'Alliage Training & Education <no-reply@training.alliage.global>';

export function normalizeLanguage(value) {
  return ['pt', 'en', 'es'].includes(value) ? value : 'pt';
}

export function languageForRegion(region) {
  if (region === 'LATAM') return 'es';
  if (region === 'USA' || region === 'ROW') return 'en';
  return 'pt';
}

export function pickTranslated(value, language) {
  if (!value || typeof value === 'string') return value || '';
  const lang = normalizeLanguage(language);
  return value[lang] || value.pt || value.en || value.es || '';
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

export function uniqueEmails(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim().toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))];
}

export function formatDate(value, language) {
  if (!value) return { pt: 'A definir', en: 'To be confirmed', es: 'Por definir' }[normalizeLanguage(language)];
  const locale = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[normalizeLanguage(language)];
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

const COPY = {
  pt: {
    adminRequestSubject: 'Nova solicitação', adminRequestTitle: 'Nova solicitação para análise', accessSubject: 'Novo pedido de acesso', accessTitle: 'Novo pedido de acesso', accessIntro: 'Uma pessoa solicitou acesso à plataforma e aguarda autorização.', accessAction: 'Acesse a área de Configurações para aprovar ou rejeitar o pedido.',
    approvalSubject: 'Solicitação aprovada', approvalTitle: 'Sua solicitação foi aprovada!', approvalIntro: 'Temos o prazer de informar que sua solicitação foi aprovada.', rejectionSubject: 'Solicitação não aprovada', rejectionTitle: 'Informação sobre sua solicitação', rejectionIntro: 'Sua solicitação não foi aprovada neste momento.', rejectionAfter: 'Você poderá enviar uma nova solicitação quando tiver informações atualizadas.',
    reminderSubject: 'Lembrete: sua atividade é amanhã', reminderTitle: 'Sua atividade é amanhã!', reminderIntro: 'Este é um lembrete da atividade agendada para amanhã.', reminderEnd: 'Contamos com a sua presença!',
    surveySubject: 'Pesquisa de satisfação', surveyTitle: 'Pesquisa de satisfação', surveyIntro: 'Obrigado por participar. Sua opinião nos ajuda a melhorar continuamente nossos programas.', surveyAction: 'Responder pesquisa', surveyPrivate: 'Esta pesquisa é confidencial e os dados serão usados apenas para melhorias no programa.',
    surveyResendSubject: 'Lembrete: pesquisa de satisfação', surveyResendTitle: 'Lembrete da pesquisa de satisfação', surveyResendIntro: 'Estamos reenviando o convite para você completar sua avaliação.',
    passwordSubject: 'Acesso aprovado — defina sua senha', passwordTitle: 'Acesso aprovado', passwordIntro: 'Seu acesso ao Portal de Treinamentos Alliage foi aprovado. Defina sua senha para começar.', passwordAction: 'Definir minha senha', passwordIgnore: 'Se você não solicitou acesso, ignore este email.',
    hello: 'Olá', request: 'Solicitação', requester: 'Solicitante', type: 'Tipo', product: 'Produto/Tema', region: 'Região', priority: 'Prioridade', educator: 'Educador', date: 'Data', format: 'Formato', location: 'Local', participation: 'Sua participação', reason: 'Motivo', name: 'Nome', email: 'Email', phone: 'Telefone', company: 'Empresa', review: 'Revisar solicitação', questions: 'Dúvidas? Entre em contato conosco.', onlinePending: 'O link online será enviado pelo educador responsável.'
  },
  en: {
    adminRequestSubject: 'New request', adminRequestTitle: 'New request for review', accessSubject: 'New access request', accessTitle: 'New access request', accessIntro: 'Someone requested access to the platform and is awaiting authorization.', accessAction: 'Open Settings to approve or reject the request.',
    approvalSubject: 'Request approved', approvalTitle: 'Your request was approved!', approvalIntro: 'We are pleased to inform you that your request has been approved.', rejectionSubject: 'Request not approved', rejectionTitle: 'Information about your request', rejectionIntro: 'Your request was not approved at this time.', rejectionAfter: 'You may submit a new request when you have updated information.',
    reminderSubject: 'Reminder: your activity is tomorrow', reminderTitle: 'Your activity is tomorrow!', reminderIntro: 'This is a reminder of the activity scheduled for tomorrow.', reminderEnd: 'We look forward to seeing you!',
    surveySubject: 'Satisfaction survey', surveyTitle: 'Satisfaction survey', surveyIntro: 'Thank you for participating. Your feedback helps us continuously improve our programs.', surveyAction: 'Answer survey', surveyPrivate: 'This survey is confidential and the data will only be used to improve the program.',
    surveyResendSubject: 'Reminder: satisfaction survey', surveyResendTitle: 'Satisfaction survey reminder', surveyResendIntro: 'We are resending the invitation for you to complete your evaluation.',
    passwordSubject: 'Access approved — set your password', passwordTitle: 'Access approved', passwordIntro: 'Your access to the Alliage Training Portal was approved. Set your password to get started.', passwordAction: 'Set my password', passwordIgnore: 'If you did not request access, ignore this email.',
    hello: 'Hello', request: 'Request', requester: 'Requester', type: 'Type', product: 'Product/Topic', region: 'Region', priority: 'Priority', educator: 'Educator', date: 'Date', format: 'Format', location: 'Location', participation: 'Your attendance', reason: 'Reason', name: 'Name', email: 'Email', phone: 'Phone', company: 'Company', review: 'Review request', questions: 'Questions? Contact us.', onlinePending: 'The online link will be sent by the assigned educator.'
  },
  es: {
    adminRequestSubject: 'Nueva solicitud', adminRequestTitle: 'Nueva solicitud para análisis', accessSubject: 'Nueva solicitud de acceso', accessTitle: 'Nueva solicitud de acceso', accessIntro: 'Una persona solicitó acceso a la plataforma y espera autorización.', accessAction: 'Acceda a Configuración para aprobar o rechazar la solicitud.',
    approvalSubject: 'Solicitud aprobada', approvalTitle: '¡Su solicitud fue aprobada!', approvalIntro: 'Nos complace informarle que su solicitud fue aprobada.', rejectionSubject: 'Solicitud no aprobada', rejectionTitle: 'Información sobre su solicitud', rejectionIntro: 'Su solicitud no fue aprobada en este momento.', rejectionAfter: 'Podrá enviar una nueva solicitud cuando tenga información actualizada.',
    reminderSubject: 'Recordatorio: su actividad es mañana', reminderTitle: '¡Su actividad es mañana!', reminderIntro: 'Este es un recordatorio de la actividad programada para mañana.', reminderEnd: '¡Contamos con su presencia!',
    surveySubject: 'Encuesta de satisfacción', surveyTitle: 'Encuesta de satisfacción', surveyIntro: 'Gracias por participar. Su opinión nos ayuda a mejorar continuamente nuestros programas.', surveyAction: 'Responder encuesta', surveyPrivate: 'Esta encuesta es confidencial y los datos se usarán solamente para mejorar el programa.',
    surveyResendSubject: 'Recordatorio: encuesta de satisfacción', surveyResendTitle: 'Recordatorio de la encuesta', surveyResendIntro: 'Estamos reenviando la invitación para que complete su evaluación.',
    passwordSubject: 'Acceso aprobado — defina su contraseña', passwordTitle: 'Acceso aprobado', passwordIntro: 'Su acceso al Portal de Capacitaciones Alliage fue aprobado. Defina su contraseña para comenzar.', passwordAction: 'Definir mi contraseña', passwordIgnore: 'Si no solicitó acceso, ignore este email.',
    hello: 'Hola', request: 'Solicitud', requester: 'Solicitante', type: 'Tipo', product: 'Producto/Tema', region: 'Región', priority: 'Prioridad', educator: 'Educador', date: 'Fecha', format: 'Formato', location: 'Lugar', participation: 'Su participación', reason: 'Motivo', name: 'Nombre', email: 'Email', phone: 'Teléfono', company: 'Empresa', review: 'Revisar solicitud', questions: '¿Dudas? Contáctenos.', onlinePending: 'El enlace online será enviado por el educador responsable.'
  }
};

function document(title, content) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f8fb;padding:24px"><div style="background:#fff;border-radius:16px;overflow:hidden"><div style="background:#003B5C;padding:24px"><h1 style="color:#fff;font-size:22px;margin:0">${escapeHtml(title)}</h1></div><div style="padding:28px;color:#475569;line-height:1.6">${content}</div></div></div>`;
}

function details(rows) {
  return `<div style="background:#f5f7f9;padding:18px;border-radius:10px;margin:20px 0">${rows.filter((row) => row[1]).map(([label, value]) => `<p style="margin:7px 0"><strong>${escapeHtml(label)}:</strong> ${value}</p>`).join('')}</div>`;
}

function button(label, url) {
  return url ? `<p style="margin:24px 0;text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#00A6D6;color:#fff;text-decoration:none;border-radius:24px;font-weight:bold">${escapeHtml(label)}</a></p>` : '';
}

export function buildEmail(kind, language, data = {}) {
  const lang = normalizeLanguage(language);
  const c = COPY[lang];
  const safeName = escapeHtml(data.name || '');
  const hello = safeName ? `<p>${c.hello} ${safeName},</p>` : '';
  if (kind === 'adminRequest') return { subject: `[${data.priority || c.adminRequestSubject}] ${c.adminRequestSubject} - ${data.requestId || ''}`, html: document(c.adminRequestTitle, details([[c.request, escapeHtml(data.requestId)], [c.requester, escapeHtml(data.name)], [c.email, escapeHtml(data.email)], [c.type, escapeHtml(data.type)], [c.product, escapeHtml(data.product)], [c.region, escapeHtml(data.region)], [c.priority, escapeHtml(data.priority)]]) + button(c.review, data.url)) };
  if (kind === 'accessAdmin') return { subject: c.accessSubject, html: document(c.accessTitle, `<p>${c.accessIntro}</p>` + details([[c.name, escapeHtml(data.name)], [c.email, escapeHtml(data.email)], [c.phone, escapeHtml(data.phone)], [c.company, escapeHtml(data.company)]]) + `<p>${c.accessAction}</p>`) };
  if (kind === 'approval') return { subject: `${c.approvalSubject} - ${data.requestId || ''}`, html: document(c.approvalTitle, hello + `<p>${c.approvalIntro}</p>` + details([[c.request, escapeHtml(data.requestId)], [c.product, escapeHtml(data.product)], [c.educator, escapeHtml(data.educator)], [c.date, escapeHtml(data.date)]]) + `<p>${c.questions}</p>`) };
  if (kind === 'rejection') return { subject: `${c.rejectionSubject} - ${data.requestId || ''}`, html: document(c.rejectionTitle, hello + `<p>${c.rejectionIntro}</p>` + details([[c.request, escapeHtml(data.requestId)], [c.product, escapeHtml(data.product)], [c.reason, escapeHtml(data.reason)]]) + `<p>${c.rejectionAfter}</p><p>${c.questions}</p>`) };
  if (kind === 'reminder') return { subject: `${c.reminderSubject}${data.product ? ` — ${data.product}` : ''}`, html: document(c.reminderTitle, hello + `<p>${c.reminderIntro}</p>` + details([[c.request, escapeHtml(data.requestId)], [c.product, escapeHtml(data.product)], [c.date, escapeHtml(data.date)], [c.format, escapeHtml(data.format)], [c.location, escapeHtml(data.location)], [c.participation, escapeHtml(data.participation)]]) + (data.accessHtml || '') + `<p><strong>${c.reminderEnd}</strong></p>`) };
  if (kind === 'survey' || kind === 'surveyResend') { const resend = kind === 'surveyResend'; return { subject: `${resend ? c.surveyResendSubject : c.surveySubject} - ${data.requestId || ''}`, html: document(resend ? c.surveyResendTitle : c.surveyTitle, hello + `<p>${resend ? c.surveyResendIntro : c.surveyIntro}</p>` + details([[c.request, escapeHtml(data.requestId)], [c.product, escapeHtml(data.product)]]) + button(c.surveyAction, data.url) + `<p style="font-size:12px;color:#94a3b8">${c.surveyPrivate}</p>`) }; }
  if (kind === 'password') return { subject: c.passwordSubject, html: document(c.passwordTitle, hello + `<p>${c.passwordIntro}</p>` + details([[c.email, escapeHtml(data.email)]]) + button(c.passwordAction, data.url) + `<p style="font-size:12px;color:#94a3b8">${c.passwordIgnore}</p>`) };
  throw new Error(`Unknown email kind: ${kind}`);
}