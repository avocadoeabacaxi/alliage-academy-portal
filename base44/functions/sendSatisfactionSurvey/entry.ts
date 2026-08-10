import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, normalizeLanguage, uniqueEmails } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    let request = null;
    if (body?.event?.entity_name === 'TrainingRequest') {
      request = body.data || await base44.asServiceRole.entities.TrainingRequest.get(body.event.entity_id);
      if (request?.status !== 'Concluído') return Response.json({ skipped: true, reason: 'status is not Concluído' });
      if (body.old_data?.status === 'Concluído') return Response.json({ skipped: true, reason: 'already completed before' });
    } else if (body?.training_request_id) request = await base44.asServiceRole.entities.TrainingRequest.get(body.training_request_id);
    if (!request) return Response.json({ error: 'Training request not found' }, { status: 404 });
    if (!request.requester_email) return Response.json({ error: 'No requester email on request' }, { status: 400 });
    const existing = await base44.asServiceRole.entities.SatisfactionSurvey.filter({ training_request_id: request.id });
    let survey = existing[0];
    if (!survey) {
      const focus = typeof request.training_focus === 'object' ? (request.training_focus.pt || request.training_focus.en || request.training_focus.es || '') : (request.training_focus || '');
      const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Create 6-8 satisfaction survey questions in Portuguese, English and Spanish for this Alliage medical-device training. Type: ${request.request_type || '—'}. Product: ${request.product_name || '—'}. Focus: ${focus}. Include overall satisfaction, content, instructor, practical application, knowledge improvement, and one open suggestion question. Use rating or text types.`,
        response_json_schema: { type: 'object', properties: { questions: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'object', properties: { pt: { type: 'string' }, en: { type: 'string' }, es: { type: 'string' } }, required: ['pt', 'en', 'es'] }, type: { type: 'string', enum: ['rating', 'text'] } }, required: ['id', 'text', 'type'] } } }, required: ['questions'] }
      });
      survey = await base44.asServiceRole.entities.SatisfactionSurvey.create({ training_request_id: request.id, request_id_display: request.request_id || '', questions: generated.questions, public_token: crypto.randomUUID(), is_active: true });
    }
    const surveyUrl = `https://training.alliage.global/survey/${survey.public_token}?lang=${normalizeLanguage(request.original_language)}`;
    const evaluations = await base44.asServiceRole.entities.TrainingEvaluation.filter({ training_request_id: request.id });
    if (!evaluations.length) await base44.asServiceRole.entities.TrainingEvaluation.create({ training_request_id: request.id, request_id_display: request.request_id || '', educator_name: request.educator_name || 'A Definir', educator_id: request.educator_id, product_name: request.product_name || '—', training_date: request.training_completed_date || request.training_scheduled_date, questions: survey.questions, status: 'sent', public_token: survey.public_token, sent_at: new Date().toISOString() });
    else await base44.asServiceRole.entities.TrainingEvaluation.update(evaluations[0].id, { status: evaluations[0].status === 'completed' ? 'completed' : 'sent', public_token: survey.public_token, sent_at: new Date().toISOString() });
    const recipients = uniqueEmails([request.requester_email, ...(request.participants_list || []).map((participant) => participant?.email)]);
    const language = normalizeLanguage(request.original_language);
    const message = buildEmail('survey', language, { name: request.requester_name, requestId: request.request_id, product: request.product_name, url: surveyUrl });
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, recipients, language, from: EMAIL_FROM, subject: message.subject });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    const results = await Promise.all(recipients.map((email) => resend.emails.send({ from: EMAIL_FROM, to: email, ...message })));
    const failed = results.find((result) => result.error);
    if (failed?.error) return Response.json({ error: failed.error.message }, { status: 500 });
    return Response.json({ success: true, emails_sent: recipients.length, survey_url: surveyUrl, language });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}