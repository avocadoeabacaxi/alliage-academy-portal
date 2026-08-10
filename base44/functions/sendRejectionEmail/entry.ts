import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, normalizeLanguage, pickTranslated } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const record = body?.event ? (body.data || await base44.asServiceRole.entities.TrainingRequest.get(body.event.entity_id)) : body;
    if (body?.event && (record?.status !== 'Rejeitado' || body?.old_data?.status === 'Rejeitado')) return Response.json({ skipped: true, reason: 'status not newly rejected' });
    if (!record?.requester_email) return Response.json({ error: 'No requester email' }, { status: 400 });
    const language = normalizeLanguage(record.original_language);
    const message = buildEmail('rejection', language, { name: record.requester_name, requestId: record.request_id, product: record.product_name, reason: pickTranslated(record.rejection_reason, language) });
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, to: record.requester_email, language, from: EMAIL_FROM, subject: message.subject });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    const result = await resend.emails.send({ from: EMAIL_FROM, to: record.requester_email, ...message });
    if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
    return Response.json({ success: true, email_id: result.data.id, language });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}