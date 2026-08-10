import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { secrets } from 'base44:runtime';
import { EMAIL_FROM, buildEmail, normalizeLanguage } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, full_name, phone, company_type, company_name } = body;
    const language = normalizeLanguage(body.preferred_language);
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !full_name || !phone || !company_type || !company_name) return Response.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const recipients = admins.filter((admin) => admin.receive_access_request_emails === true && admin.email);
    if (body.dry_run === true) return Response.json({ success: true, dry_run: true, recipients: recipients.map((admin) => admin.email), preferred_language: language, from: EMAIL_FROM });
    const existing = await base44.asServiceRole.entities.UserAuthorization.filter({ email: normalizedEmail });
    if (existing.length) {
      const messages = {
        pt: { pending: 'Você já possui uma solicitação pendente de aprovação.', approved: 'Seu acesso já foi aprovado. Verifique seu email.', rejected: 'Sua solicitação foi rejeitada. Contate o administrador.' },
        en: { pending: 'You already have an access request awaiting approval.', approved: 'Your access has already been approved. Check your email.', rejected: 'Your request was rejected. Contact the administrator.' },
        es: { pending: 'Ya tiene una solicitud pendiente de aprobación.', approved: 'Su acceso ya fue aprobado. Revise su email.', rejected: 'Su solicitud fue rechazada. Contacte al administrador.' }
      };
      return Response.json({ success: false, message: messages[language][existing[0].status], status: existing[0].status });
    }
    await base44.asServiceRole.entities.UserAuthorization.create({ email: normalizedEmail, full_name, phone, company_type, company_name, role: 'solicitante', preferred_language: language, status: 'pending', first_login_attempt: new Date().toISOString() });
    const resend = new Resend(secrets.get('RESEND_API_KEY'));
    await Promise.all(recipients.map((admin) => {
      const message = buildEmail('accessAdmin', admin.preferred_language || 'pt', { name: full_name, email: normalizedEmail, phone, company: `${company_type} — ${company_name}` });
      return resend.emails.send({ from: EMAIL_FROM, to: admin.email, ...message });
    }));
    const success = { pt: 'Cadastro realizado. Seu acesso ficará disponível após a aprovação do administrador.', en: 'Registration completed. Your access will be available after administrator approval.', es: 'Registro realizado. Su acceso estará disponible después de la aprobación del administrador.' }[language];
    return Response.json({ success: true, message: success, status: 'pending' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}