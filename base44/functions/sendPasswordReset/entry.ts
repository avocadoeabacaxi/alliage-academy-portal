import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, languageForRegion, normalizeLanguage } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    const body = await req.json();
    const normalizedEmail = body.email?.toLowerCase().trim();
    if (!normalizedEmail) return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    const authorizations = await base44.asServiceRole.entities.UserAuthorization.filter({ email: normalizedEmail });
    const authorization = authorizations[0];
    const language = normalizeLanguage(body.preferred_language || authorization?.preferred_language || languageForRegion(authorization?.region));
    const link = `https://training.alliage.global/set-password?email=${encodeURIComponent(normalizedEmail)}&lang=${language}`;
    const message = buildEmail('password', language, { name: body.full_name || authorization?.full_name, email: normalizedEmail, url: link });
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, to: normalizedEmail, language, from: EMAIL_FROM, subject: message.subject });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    const result = await resend.emails.send({ from: EMAIL_FROM, to: normalizedEmail, ...message });
    if (result.error) return Response.json({ error: 'Falha ao enviar email: ' + result.error.message }, { status: 500 });
    return Response.json({ success: true, message: 'Email de definição de senha enviado com sucesso!', language });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}