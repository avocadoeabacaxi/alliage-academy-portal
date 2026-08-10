import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, formatDate, normalizeLanguage } from '../../shared/email.js';

export default async function(req) {
  try {
    const body = await req.json();
    if (!body.requester_email) return Response.json({ error: 'No requester email' }, { status: 400 });
    const language = normalizeLanguage(body.original_language);
    const message = buildEmail('reminder', language, { name: body.requester_name, requestId: body.request_id, product: body.product_name, date: formatDate(body.training_scheduled_date, language), format: body.format === 'Remoto' ? 'Online' : body.format, location: body.location_city });
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, to: body.requester_email, language, from: EMAIL_FROM, subject: message.subject });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    const result = await resend.emails.send({ from: EMAIL_FROM, to: body.requester_email, ...message });
    if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
    return Response.json({ success: true, email_id: result.data.id, language });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}