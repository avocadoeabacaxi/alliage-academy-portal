import { randomUUID } from 'node:crypto';
import { config } from './config.mjs';
import {
  createRecord,
  getRecord,
  listRecords,
  nextTrainingRequestId,
  updateRecord,
} from './db.mjs';
import { evaluationQuestions, generateSurveyQuestions, translateTexts } from './ai.mjs';
import { escapeHtml, fillTemplate, sendEmail } from './mailer.mjs';

const FINAL_APPROVER_EMAIL = 'caio.monteiro@alliage-global.com';
const EXCLUDED_EMAILS = new Set(['fernando@avocado.buzz']);

const defaultTemplates = {
  admin_notification: {
    subject: '[${priority}] Nova Solicitação - ${request_id}',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#003B5C">Nova solicitação</h2><p>Uma nova solicitação aguarda análise.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px"><p><strong>ID:</strong> ${request_id}</p><p><strong>Solicitante:</strong> ${requester_name}</p><p><strong>Email:</strong> ${requester_email}</p><p><strong>Produto:</strong> ${product_name}</p><p><strong>Prioridade:</strong> ${priority}</p></div><p><a href="${review_url}" style="display:inline-block;padding:12px 24px;background:#00A6D6;color:white;text-decoration:none;border-radius:24px">Revisar solicitação</a></p></div>',
  },
  approval: {
    subject: '✅ Sua Solicitação foi Aprovada - ${request_id}',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#00A6D6">Sua solicitação foi aprovada!</h2><p>Olá ${requester_name},</p><div style="background:#f0fdf4;padding:20px;border-radius:8px"><p><strong>Solicitação:</strong> ${request_id}</p><p><strong>Produto:</strong> ${product_name}</p><p><strong>Educador:</strong> ${educator_name}</p><p><strong>Data:</strong> ${training_scheduled_date}</p></div></div>',
  },
  rejection: {
    subject: '❌ Solicitação Não Aprovada - ${request_id}',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#003B5C">Informação sobre sua solicitação</h2><p>Olá ${requester_name},</p><div style="background:#fef2f2;padding:20px;border-radius:8px"><p><strong>Solicitação:</strong> ${request_id}</p><p><strong>Produto:</strong> ${product_name}</p><p><strong>Motivo:</strong> ${rejection_reason}</p></div></div>',
  },
  training_reminder: {
    subject: '📅 Lembrete: Sua atividade é amanhã!',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#003B5C">Sua atividade é amanhã!</h2><p>Olá ${participant_name},</p><div style="background:#f5f5f5;padding:20px;border-radius:8px"><p><strong>Produto/Tema:</strong> ${product_name}</p><p><strong>Data:</strong> ${training_scheduled_date}</p><p><strong>Participação:</strong> ${attendance_mode}</p>${access_html}</div><p>${calendar_links}</p></div>',
  },
  survey: {
    subject: '📋 Pesquisa de Satisfação - Treinamento ${request_id}',
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#003B5C">Pesquisa de satisfação</h2><p>Olá ${requester_name}, obrigado por participar!</p><div style="background:#f5f5f5;padding:20px;border-radius:8px"><p><strong>Solicitação:</strong> ${request_id}</p><p><strong>Produto:</strong> ${product_name}</p></div><p><a href="${survey_url}" style="display:inline-block;padding:12px 24px;background:#00A6D6;color:white;text-decoration:none;border-radius:24px">Responder pesquisa</a></p></div>',
  },
};

function requireUser(user) {
  if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
}

function requireAdmin(user) {
  requireUser(user);
  if (user.role !== 'admin') throw Object.assign(new Error('Apenas administradores'), { status: 403 });
}

function requireManagement(user) {
  requireUser(user);
  if (!['admin', 'gerente_regional', 'educador'].includes(user.role)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}

function templateFor(type) {
  return listRecords('EmailTemplate', { filters: { template_type: type }, limit: 1 })[0] || defaultTemplates[type];
}

function localized(value) {
  if (value && typeof value === 'object') return value.pt || value.en || value.es || '';
  return value || '';
}

function mailVariables(request, extras = {}) {
  return {
    request_id: escapeHtml(request.request_id || ''),
    requester_name: escapeHtml(request.requester_name || ''),
    requester_email: escapeHtml(request.requester_email || ''),
    product_name: escapeHtml(request.product_name || request.product_category || ''),
    priority: escapeHtml(request.priority || 'Nova'),
    educator_name: escapeHtml(request.educator_name || 'A definir'),
    training_scheduled_date: escapeHtml(request.training_scheduled_date || request.event_start_date || 'A agendar'),
    format: escapeHtml(request.format || ''),
    ...extras,
  };
}

function uniqueEmails(values) {
  return [...new Set(values.filter(email => email?.includes('@')).map(email => email.trim().toLowerCase()))];
}

export async function sendAccessEmail(email, fullName = '') {
  const setPasswordUrl = `${config.appOrigin}/set-password?email=${encodeURIComponent(email.toLowerCase())}`;
  const subject = '✅ Acesso Aprovado — Defina sua Senha | Portal de Treinamentos Alliage';
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f8fb;padding:24px"><div style="background:white;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#003B5C,#00A6D6);padding:28px;text-align:center"><h1 style="color:white;font-size:22px;margin:0">Portal de Treinamentos Alliage</h1></div><div style="padding:32px"><h2 style="color:#003B5C">Acesso aprovado ✅</h2><p>Olá${fullName ? `, ${escapeHtml(fullName)}` : ''}, seu acesso foi liberado. Defina sua senha para entrar no portal.</p><p style="text-align:center;margin:28px 0"><a href="${setPasswordUrl}" style="display:inline-block;background:#00A6D6;color:white;padding:14px 40px;border-radius:9999px;text-decoration:none">Definir minha senha</a></p><p style="font-size:12px;color:#64748b">O cadastro só será concluído após a confirmação do código enviado ao seu e-mail.</p></div></div></div>`;
  return sendEmail({ emailType: 'access', to: email, subject, html });
}

export async function notifyAdminNewRequest(request) {
  const ruleType = request.request_category === 'Evento' ? 'Evento' : request.request_type;
  const rules = ruleType ? listRecords('RoutingRule', { filters: { request_type: ruleType } }) : [];
  const exact = rules.find(rule => rule.product_category && rule.product_category !== '*' && rule.product_category === request.product_category);
  const wildcard = rules.find(rule => !rule.product_category || rule.product_category === '*');
  let recipients = [...((exact || wildcard)?.recipient_emails || [])];

  if (recipients.length === 0) {
    recipients = listRecords('UserAuthorization', { filters: { status: 'approved', role: 'admin' } }).map(record => record.email);
  }
  recipients.push(FINAL_APPROVER_EMAIL);
  recipients = uniqueEmails(recipients).filter(email => !EXCLUDED_EMAILS.has(email));
  if (recipients.length === 0) return { skipped: true, reason: 'No recipients' };

  const template = templateFor('admin_notification');
  const variables = mailVariables(request, { review_url: `${config.appOrigin}/requests/${request.id}` });
  return sendEmail({
    emailType: 'admin_notification',
    to: recipients,
    subject: fillTemplate(template.subject, variables),
    html: fillTemplate(template.html_content || template.html, variables),
  });
}

export async function sendApprovalEmail(request) {
  if (!request.requester_email) return { skipped: true };
  const template = templateFor('approval');
  const variables = mailVariables(request);
  return sendEmail({ emailType: 'approval', to: request.requester_email, subject: fillTemplate(template.subject, variables), html: fillTemplate(template.html_content || template.html, variables) });
}

export async function sendRejectionEmail(request) {
  if (!request.requester_email) return { skipped: true };
  const template = templateFor('rejection');
  const variables = mailVariables(request, { rejection_reason: escapeHtml(localized(request.rejection_reason) || 'A solicitação não foi aprovada neste momento.') });
  return sendEmail({ emailType: 'rejection', to: request.requester_email, subject: fillTemplate(template.subject, variables), html: fillTemplate(template.html_content || template.html, variables) });
}

export async function ensureSurvey(request) {
  let survey = listRecords('SatisfactionSurvey', { filters: { training_request_id: request.id }, limit: 1 })[0];
  if (!survey) {
    survey = createRecord('SatisfactionSurvey', {
      training_request_id: request.id,
      request_id_display: request.request_id || '',
      questions: await generateSurveyQuestions(request),
      public_token: randomUUID(),
      is_active: true,
    });
  }

  const evaluations = listRecords('TrainingEvaluation', { filters: { training_request_id: request.id }, limit: 1 });
  if (evaluations.length === 0) {
    createRecord('TrainingEvaluation', {
      training_request_id: request.id,
      request_id_display: request.request_id || '',
      educator_name: request.educator_name || 'A definir',
      educator_id: request.educator_id || '',
      product_name: request.product_name || '—',
      training_date: request.training_completed_date || request.training_scheduled_date || '',
      questions: survey.questions,
      status: 'sent',
      public_token: survey.public_token,
      sent_at: new Date().toISOString(),
    });
  } else {
    updateRecord('TrainingEvaluation', evaluations[0].id, {
      status: evaluations[0].status === 'completed' ? 'completed' : 'sent',
      public_token: survey.public_token,
      sent_at: new Date().toISOString(),
    });
  }
  return survey;
}

export async function sendSatisfactionSurvey(request) {
  if (!request.requester_email) return { skipped: true };
  const survey = await ensureSurvey(request);
  const surveyUrl = `${config.appOrigin}/survey/${survey.public_token}`;
  const template = templateFor('survey');
  const variables = mailVariables(request, { survey_url: surveyUrl });
  const recipients = uniqueEmails([request.requester_email, ...(request.participants_list || []).map(participant => participant?.email)]);
  await Promise.all(recipients.map(to => sendEmail({ emailType: 'survey', to, subject: fillTemplate(template.subject, variables), html: fillTemplate(template.html_content || template.html, variables) })));
  return { success: true, emails_sent: recipients.length, survey_url: surveyUrl };
}

export async function runRecordAutomation(entity, previous, current) {
  try {
    if (entity === 'TrainingRequest') {
      if (!previous) await notifyAdminNewRequest(current);
      if (previous && previous.status !== current.status && current.status === 'Aprovado Etapa 2') await sendApprovalEmail(current);
      if (previous && previous.status !== current.status && current.status === 'Rejeitado') await sendRejectionEmail(current);
      if (previous && previous.status !== current.status && current.status === 'Concluído') await sendSatisfactionSurvey(current);
    }
    if (entity === 'UserAuthorization' && previous && previous.status !== current.status) {
      if (current.status === 'approved') await sendAccessEmail(current.email, current.full_name || '');
      if (current.status === 'rejected') {
        await sendEmail({
          emailType: 'access_rejected',
          to: current.email,
          subject: 'Atualização do seu acesso — Alliage Trainning',
          html: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#003B5C">Solicitação de acesso</h2><p>Olá${current.full_name ? `, ${escapeHtml(current.full_name)}` : ''}.</p><p>Seu pedido de acesso não foi aprovado neste momento.</p>${current.rejection_reason ? `<p><strong>Motivo:</strong> ${escapeHtml(current.rejection_reason)}</p>` : ''}</div>`,
        });
      }
    }
  } catch (error) {
    console.error('Record automation failed:', error);
  }
}

export async function sendParticipantReminders({ dryRun = false } = {}) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const requests = listRecords('TrainingRequest', { limit: 5000 }).filter(request =>
    (request.training_scheduled_date === tomorrow || request.event_start_date === tomorrow)
    && request.status !== 'Cancelado'
    && !request.reminder_sent
    && Array.isArray(request.participants_list)
    && request.participants_list.length > 0
  );
  if (dryRun) return { success: true, dry_run: true, trainings_to_notify: requests.length, date: tomorrow };

  let emailsSent = 0;
  for (const request of requests) {
    const participants = request.participants_list.filter(participant => participant?.email?.includes('@'));
    let sentForRequest = 0;
    for (const participant of participants) {
      const attendanceMode = participant.attendance_mode || request.guest_participation_mode || 'Presencial';
      const location = request.location_formatted_address || [request.location_street, request.location_number, request.location_city, request.location_country].filter(Boolean).join(', ');
      const roomLink = request.online_access_link || '';
      const accessParts = [attendanceMode !== 'Online' && location ? `Local: ${location}` : '', attendanceMode !== 'Presencial' && roomLink ? `Sala: ${roomLink}` : ''].filter(Boolean);
      const calendarLocation = attendanceMode === 'Online' ? roomLink : location;
      const productName = request.product_name || 'Atividade Alliage';
      const startDate = request.training_scheduled_date || request.event_start_date || tomorrow;
      const endDate = request.event_end_date || startDate;
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(productName)}&dates=${startDate.replaceAll('-', '')}/${endDate.replaceAll('-', '')}&details=${encodeURIComponent(accessParts.join(' | '))}&location=${encodeURIComponent(calendarLocation || '')}`;
      const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(productName)}&startdt=${startDate}T00%3A00%3A00&enddt=${endDate}T23%3A59%3A00&body=${encodeURIComponent(accessParts.join(' | '))}&location=${encodeURIComponent(calendarLocation || '')}`;
      const accessHtml = accessParts.map(part => `<p>${escapeHtml(part)}</p>`).join('');
      const calendarLinks = `<a href="${googleCalendarUrl}">Google Calendar</a> · <a href="${outlookUrl}">Outlook Calendar</a>`;
      const template = templateFor('training_reminder');
      const variables = mailVariables(request, {
        participant_name: escapeHtml(participant.name || 'participante'),
        attendance_mode: escapeHtml(attendanceMode),
        access_html: accessHtml,
        calendar_links: calendarLinks,
      });
      const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Alliage//Training//PT\r\nBEGIN:VEVENT\r\nUID:${request.id}-${participant.email}@alliage.global\r\nDTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z\r\nDTSTART;VALUE=DATE:${startDate.replaceAll('-', '')}\r\nDTEND;VALUE=DATE:${endDate.replaceAll('-', '')}\r\nSUMMARY:${productName}\r\nLOCATION:${calendarLocation || ''}\r\nDESCRIPTION:${accessParts.join(' | ')}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
      await sendEmail({
        emailType: 'training_reminder',
        to: participant.email,
        subject: fillTemplate(template.subject, variables),
        html: fillTemplate(template.html_content || template.html, variables),
        attachments: [{ filename: 'atividade-alliage.ics', content: Buffer.from(ics).toString('base64') }],
      });
      emailsSent += 1;
      sentForRequest += 1;
    }
    if (participants.length > 0 && sentForRequest === participants.length) updateRecord('TrainingRequest', request.id, { reminder_sent: true });
  }
  return { success: true, trainings_notified: requests.length, emails_sent: emailsSent, date: tomorrow };
}

export async function invokeFunction(name, payload = {}, user = null) {
  switch (name) {
    case 'requestAccess': {
      const email = payload.email?.trim().toLowerCase();
      if (!email || !payload.full_name || !payload.phone || !payload.company_type || !payload.company_name) {
        throw Object.assign(new Error('Preencha todos os campos obrigatórios'), { status: 400 });
      }
      const existing = listRecords('UserAuthorization', { filters: { email }, limit: 1 })[0];
      if (existing) {
        return { success: false, status: existing.status, message: existing.status === 'pending' ? 'Você já possui uma solicitação pendente de aprovação.' : existing.status === 'approved' ? 'Seu acesso já foi aprovado.' : 'Sua solicitação foi rejeitada. Contate o administrador.' };
      }
      if (payload.dry_run) return { success: true, dry_run: true };
      createRecord('UserAuthorization', { email, full_name: payload.full_name, phone: payload.phone, company_type: payload.company_type, company_name: payload.company_name, role: 'solicitante', status: 'pending', first_login_attempt: new Date().toISOString() });
      const recipients = listRecords('User', { limit: 500 }).filter(record => record.receive_access_request_emails).map(record => record.email);
      if (recipients.length) {
        await sendEmail({ emailType: 'access_request', to: recipients, subject: 'Novo pedido de acesso — Alliage Trainning', html: `<h2>Novo pedido de acesso</h2><p><strong>Nome:</strong> ${escapeHtml(payload.full_name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Telefone:</strong> ${escapeHtml(payload.phone)}</p><p><strong>Empresa:</strong> ${escapeHtml(payload.company_type)} — ${escapeHtml(payload.company_name)}</p>` });
      }
      return { success: true, status: 'pending', message: 'Cadastro realizado. Seu acesso ficará disponível após a aprovação do administrador.' };
    }
    case 'checkUserAuthorization': {
      requireUser(user);
      const email = (payload.email || user.email).trim().toLowerCase();
      let authorization = listRecords('UserAuthorization', { filters: { email }, limit: 1 })[0];
      if (!authorization) {
        authorization = createRecord('UserAuthorization', { email, full_name: user.full_name || '', role: 'solicitante', status: 'pending', first_login_attempt: new Date().toISOString() });
      }
      if (authorization.status !== 'approved') return { authorized: false, status: authorization.status, reason: authorization.rejection_reason };
      updateRecord('UserAuthorization', authorization.id, { last_login: new Date().toISOString() });
      return { authorized: true, status: 'approved', role: authorization.role || 'solicitante' };
    }
    case 'ensureUserAuthorization': {
      requireUser(user);
      const existing = listRecords('UserAuthorization', { filters: { email: user.email }, limit: 1 })[0];
      if (existing) return { created: false, status: existing.status };
      createRecord('UserAuthorization', { email: user.email, full_name: user.full_name, role: 'solicitante', status: 'pending', first_login_attempt: new Date().toISOString() });
      return { created: true, status: 'pending' };
    }
    case 'listUserAuthorizations': {
      requireManagement(user);
      const data = listRecords('UserAuthorization', { sort: '-created_date', limit: 500 });
      const users = listRecords('User', { sort: 'created_date', limit: 500 });
      const authorizationByEmail = new Map(data.map(record => [record.email?.toLowerCase(), record]));
      const userEmails = new Set(users.map(record => record.email?.toLowerCase()));
      const merged = users.map(record => {
        const authorization = authorizationByEmail.get(record.email?.toLowerCase());
        return authorization ? { ...record, role: authorization.role || record.role, region: authorization.region || record.region || '', authorization_id: authorization.id, status: authorization.status } : record;
      });
      data.filter(record => record.status === 'approved' && !userEmails.has(record.email?.toLowerCase())).forEach(record => merged.push({ id: `auth_${record.id}`, email: record.email, full_name: record.full_name || '', role: record.role || 'solicitante', region: record.region || '', created_date: record.approved_date || record.first_login_attempt, authorization_id: record.id, pending_registration: true }));
      return { data, users: merged };
    }
    case 'authorizeEmailInvitation': {
      requireAdmin(user);
      const email = payload.email?.trim().toLowerCase();
      if (!email) throw Object.assign(new Error('Email is required'), { status: 400 });
      const existing = listRecords('UserAuthorization', { filters: { email }, limit: 1 })[0];
      const authorization = { email, full_name: payload.full_name || '', role: payload.role || 'solicitante', region: payload.region || 'Brasil', status: 'approved', approved_by: user.id, approved_date: new Date().toISOString() };
      if (existing) updateRecord('UserAuthorization', existing.id, authorization); else createRecord('UserAuthorization', authorization, user);
      return { success: true, email };
    }
    case 'updateUserAuthorization': {
      requireAdmin(user);
      const { id, ...patch } = payload;
      if (!id) throw Object.assign(new Error('Missing id'), { status: 400 });
      const previous = getRecord('UserAuthorization', id);
      const data = updateRecord('UserAuthorization', id, patch);
      if (!data) throw Object.assign(new Error('Not found'), { status: 404 });
      await runRecordAutomation('UserAuthorization', previous, data);
      return { data };
    }
    case 'generateRequestId': {
      requireUser(user);
      return { request_id: nextTrainingRequestId() };
    }
    case 'translateContent':
      requireUser(user);
      return { translations: await translateTexts(payload.texts, payload.source_lang) };
    case 'googleAddress': {
      requireUser(user);
      const headers = { 'User-Agent': 'AlliageTrainingPortal/2.0', 'Accept-Language': payload.language || 'pt-BR' };
      if (payload.action === 'search') {
        if (!payload.query || payload.query.trim().length < 3) return { suggestions: [] };
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(payload.query.trim())}`, { headers });
        if (!response.ok) throw new Error(`OpenStreetMap: ${response.status}`);
        const results = await response.json();
        return { suggestions: results.map(item => ({ placeId: `${item.osm_type.charAt(0).toUpperCase()}${item.osm_id}`, text: item.display_name })) };
      }
      if (payload.action === 'details' && payload.placeId) {
        const response = await fetch(`https://nominatim.openstreetmap.org/lookup?format=jsonv2&addressdetails=1&osm_ids=${encodeURIComponent(payload.placeId)}`, { headers });
        if (!response.ok) throw new Error(`OpenStreetMap: ${response.status}`);
        const place = (await response.json())[0];
        if (!place) throw Object.assign(new Error('Address not found'), { status: 404 });
        const parts = place.address || {};
        return { address: { location_place_id: payload.placeId, location_formatted_address: place.display_name || '', location_country: parts.country || '', location_city: parts.city || parts.town || parts.village || parts.municipality || '', location_postal_code: parts.postcode || '', location_street: parts.road || parts.pedestrian || '', location_number: parts.house_number || '', location_specific: parts.suburb || parts.neighbourhood || parts.city_district || '' } };
      }
      throw Object.assign(new Error('Invalid action'), { status: 400 });
    }
    case 'generateSurvey': {
      requireUser(user);
      const request = { request_type: payload.request_type, product_name: payload.product_name, training_focus: payload.training_focus };
      const survey = createRecord('SatisfactionSurvey', { training_request_id: payload.training_request_id, request_id_display: payload.request_id_display || '', questions: await generateSurveyQuestions(request), public_token: randomUUID(), is_active: true }, user);
      return { survey };
    }
    case 'generateEvaluationForm': {
      requireUser(user);
      const request = getRecord('TrainingRequest', payload.trainingRequestId);
      if (!request) throw Object.assign(new Error('Solicitação não encontrada'), { status: 404 });
      const questions = evaluationQuestions(request.product_name);
      const publicToken = randomUUID();
      const evaluation = createRecord('TrainingEvaluation', { training_request_id: request.id, request_id_display: request.request_id, educator_name: request.educator_name || 'A definir', educator_id: request.educator_id || '', product_name: request.product_name || '—', training_date: request.training_completed_date || request.training_scheduled_date || '', questions, status: 'pending', public_token: publicToken }, user);
      return { success: true, evaluation_id: evaluation.id, public_token: publicToken, questions_count: questions.length };
    }
    case 'getSurveyByToken': {
      const survey = listRecords('SatisfactionSurvey', { filters: { public_token: payload.token }, limit: 1 })[0];
      if (!survey || survey.is_active === false) throw Object.assign(new Error('Survey not found'), { status: 404 });
      const request = getRecord('TrainingRequest', survey.training_request_id);
      const training_request = request ? {
        id: request.id,
        request_id: request.request_id,
        product_name: request.product_name,
        request_type: request.request_type,
        justification: request.justification,
      } : null;
      return { data: survey, training_request };
    }
    case 'createSurveyResponse': {
      const survey = listRecords('SatisfactionSurvey', { filters: { id: payload.survey_id }, limit: 1 })[0];
      if (!survey || survey.is_active === false || survey.public_token !== payload.public_token || survey.training_request_id !== payload.training_request_id) {
        throw Object.assign(new Error('Survey not found'), { status: 404 });
      }
      const response = createRecord('SurveyResponse', { survey_id: payload.survey_id, training_request_id: payload.training_request_id, respondent_name: String(payload.respondent_name || '').slice(0, 200), responses: payload.responses, language: payload.language, rating_overall: payload.rating_overall, submitted_at: payload.submitted_at || new Date().toISOString() });
      const evaluation = listRecords('TrainingEvaluation', { filters: { training_request_id: payload.training_request_id }, limit: 1 })[0];
      if (evaluation) updateRecord('TrainingEvaluation', evaluation.id, { status: 'completed', responses: payload.responses, overall_rating: payload.rating_overall, submitted_at: payload.submitted_at || new Date().toISOString() });
      return { success: true, response_id: response.id };
    }
    case 'sendPasswordReset': {
      requireAdmin(user);
      const email = payload.email?.trim().toLowerCase();
      if (!email) throw Object.assign(new Error('Email é obrigatório'), { status: 400 });
      await sendAccessEmail(email, payload.full_name || '');
      return { success: true, message: 'Email de definição de senha enviado com sucesso!' };
    }
    case 'resendSurveyEmail': {
      requireManagement(user);
      const request = getRecord('TrainingRequest', payload.training_request_id);
      if (!request) throw Object.assign(new Error('Request not found'), { status: 404 });
      const survey = await ensureSurvey(request);
      const surveyUrl = `${config.appOrigin}/survey/${survey.public_token}`;
      const template = templateFor('survey');
      const variables = mailVariables(request, { survey_url: surveyUrl });
      await sendEmail({ emailType: 'survey_resend', to: request.requester_email, subject: `[Reenvio] ${fillTemplate(template.subject, variables)}`, html: fillTemplate(template.html_content || template.html, variables) });
      const evaluation = listRecords('TrainingEvaluation', { filters: { training_request_id: request.id }, limit: 1 })[0];
      if (evaluation) updateRecord('TrainingEvaluation', evaluation.id, { resend_count: (evaluation.resend_count || 0) + 1, last_resent_at: new Date().toISOString(), status: 'sent' });
      return { success: true };
    }
    case 'sendParticipantReminders':
      requireAdmin(user);
      return sendParticipantReminders({ dryRun: payload.dry_run === true });
    default:
      throw Object.assign(new Error(`Unknown function: ${name}`), { status: 404 });
  }
}
