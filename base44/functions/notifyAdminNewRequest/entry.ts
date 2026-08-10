import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, normalizeLanguage, uniqueEmails } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    let record = body?.data || null;
    if (!record && body?.event?.entity_id) record = await base44.asServiceRole.entities.TrainingRequest.get(body.event.entity_id);
    if (!record && body?.request_id) record = body;
    if (!record) return Response.json({ error: 'No request data' }, { status: 400 });
    let recordId = record.id || body?.event?.entity_id || null;
    if (!recordId && record.request_id) {
      const found = await base44.asServiceRole.entities.TrainingRequest.filter({ request_id: record.request_id });
      recordId = found[0]?.id || null;
    }
    const isEvent = record.request_category === 'Evento';
    const ruleType = isEvent ? 'Evento' : record.request_type;
    let recipients = [];
    if (ruleType) {
      const rules = await base44.asServiceRole.entities.RoutingRule.filter({ request_type: ruleType });
      const exact = rules.find((rule) => rule.product_category && rule.product_category !== '*' && rule.product_category === record.product_category);
      const wildcard = rules.find((rule) => !rule.product_category || rule.product_category === '*');
      recipients = (exact || wildcard)?.recipient_emails || [];
    }
    if (!recipients.length) {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      recipients = admins.map((admin) => admin.email);
    }
    recipients.push('caio.monteiro@alliage-global.com');
    recipients = uniqueEmails(recipients).filter((email) => email !== 'fernando@avocado.buzz');
    if (!recipients.length) return Response.json({ error: 'No recipients found' }, { status: 404 });
    const url = recordId ? `https://training.alliage.global/requests/${recordId}` : 'https://training.alliage.global/requests';
    const defaultLanguage = normalizeLanguage(record.original_language);
    const deliveries = [];
    for (const email of recipients) {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      const language = normalizeLanguage(users[0]?.preferred_language || defaultLanguage);
      const message = buildEmail('adminRequest', language, { requestId: record.request_id, name: record.requester_name, email: record.requester_email, type: isEvent ? 'Evento' : record.request_type, product: record.product_name || record.product_category, region: record.region, priority: record.priority, url });
      deliveries.push({ email, language, message });
    }
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, from: EMAIL_FROM, deliveries: deliveries.map(({ email, language, message }) => ({ email, language, subject: message.subject })) });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    const results = await Promise.all(deliveries.map(({ email, message }) => resend.emails.send({ from: EMAIL_FROM, to: email, ...message })));
    const failed = results.find((result) => result.error);
    if (failed?.error) return Response.json({ error: failed.error.message }, { status: 500 });
    return Response.json({ success: true, recipients });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}