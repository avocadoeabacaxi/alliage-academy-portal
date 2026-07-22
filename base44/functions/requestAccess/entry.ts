import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, full_name, phone, company_type, company_name } = body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !full_name || !phone || !company_type || !company_name) {
      return Response.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
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