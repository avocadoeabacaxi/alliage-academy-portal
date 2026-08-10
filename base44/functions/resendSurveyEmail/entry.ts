import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, normalizeLanguage, uniqueEmails } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.training_request_id) return Response.json({ error: 'Training request ID is required' }, { status: 400 });
    const request = await base44.asServiceRole.entities.TrainingRequest.get(body.training_request_id);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    const surveys = await base44.asServiceRole.entities.SatisfactionSurvey.filter({ training_request_id: body.training_request_id });
    const token = surveys[0]?.public_token || body.public_token;
    if (!token) return Response.json({ error: 'Survey not found' }, { status: 404 });
    const language = normalizeLanguage(request.original_language);
    const url = `https://training.alliage.global/survey/${token}?lang=${language}`;
    const recipients = uniqueEmails([request.requester_email, ...(request.participants_list || []).map((participant) => participant?.email)]);
    const message = buildEmail('surveyResend', language, { name: request.requester_name, requestId: body.request_id_display || request.request_id, product: request.product_name, url });
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, recipients, language, from: EMAIL_FROM, subject: message.subject });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    const results = await Promise.all(recipients.map((email) => resend.emails.send({ from: EMAIL_FROM, to: email, ...message })));
    const failed = results.find((result) => result.error);
    if (failed?.error) return Response.json({ error: failed.error.message }, { status: 500 });
    const evaluations = await base44.asServiceRole.entities.TrainingEvaluation.filter({ training_request_id: body.training_request_id });
    if (evaluations.length) await base44.asServiceRole.entities.TrainingEvaluation.update(evaluations[0].id, { resend_count: (evaluations[0].resend_count || 0) + 1, last_resent_at: new Date().toISOString(), status: 'sent' });
    return Response.json({ success: true, emails_sent: recipients.length, language });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}