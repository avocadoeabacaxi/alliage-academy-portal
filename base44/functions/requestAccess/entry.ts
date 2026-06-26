import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, full_name } = body;

    if (!email) return Response.json({ error: 'Email é obrigatório' }, { status: 400 });

    // Check if already exists
    const existing = await base44.asServiceRole.entities.UserAuthorization.filter({ email });
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

    // Create pending authorization
    await base44.asServiceRole.entities.UserAuthorization.create({
      email,
      full_name: full_name || '',
      role: 'solicitante',
      status: 'pending',
      first_login_attempt: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      message: 'Solicitação de acesso enviada com sucesso! Você receberá um email quando for aprovado.',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});