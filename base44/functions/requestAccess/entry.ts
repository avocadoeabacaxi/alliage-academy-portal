import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, full_name, phone, company_type, company_name } = body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !full_name || !phone || !company_type || !company_name) {
      return Response.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const recipients = admins.filter((admin) => admin.receive_access_request_emails === true && admin.email).map((admin) => admin.email);
    if (body.dry_run === true) {
      return Response.json({ success: true, dry_run: true, recipient_count: recipients.length });
    }

    const existing = await base44.asServiceRole.entities.UserAuthorization.filter({ email: normalizedEmail });
    if (existing.length > 0) {
      return Response.json({ 
        success: false, 
        message: existing[0].status === 'pending' 
          ? 'Você já possui uma solicitação pendente de aprovação.' 
          : existing[0].status === 'approved' 
          ? 'Seu acesso já foi aprovado. Verifique seu email para o convite.'
          : 'Sua solicitação foi rejeitada. Contate o administrador.',
        status: existing[0].status
      });
    }

    await base44.asServiceRole.entities.UserAuthorization.create({
      email: normalizedEmail,
      full_name,
      phone,
      company_type,
      company_name,
      role: 'solicitante',
      status: 'pending',
      first_login_attempt: new Date().toISOString()
    });

    if (recipients.length > 0) {
      const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      await Promise.allSettled(recipients.map((recipient) => resend.emails.send({
        from: 'no-reply@trainning.alliage.global',
        to: recipient,
        subject: 'Novo pedido de acesso — Alliage Academy',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#003B5C">Novo pedido de acesso</h2><p>Uma pessoa solicitou acesso à plataforma e aguarda autorização.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><p><strong>Nome:</strong> ${escapeHtml(full_name)}</p><p><strong>Email:</strong> ${escapeHtml(normalizedEmail)}</p><p><strong>Telefone:</strong> ${escapeHtml(phone)}</p><p><strong>Empresa:</strong> ${escapeHtml(company_type)} — ${escapeHtml(company_name)}</p></div><p>Acesse a área de Configurações da plataforma para aprovar ou rejeitar o pedido.</p></div>`
      })));
    }

    return Response.json({
      success: true,
      message: 'Cadastro realizado. Seu acesso ficará disponível após a aprovação do administrador.',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});