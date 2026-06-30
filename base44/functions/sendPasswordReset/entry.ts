import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores' }, { status: 403 });

    const body = await req.json();
    const { email } = body;
    if (!email) return Response.json({ error: 'Email é obrigatório' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    // Determine the app's base URL from the request origin (the admin's current domain)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/(admin|settings|users).*$/, '') || 'https://trainning.alliage.global';
    const baseUrl = origin.replace(/\/$/, '');

    // Check if a platform user account already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const platformUserExists = existingUsers.length > 0;

    // If no platform account, invite the user so they get one
    if (!platformUserExists) {
      try {
        await base44.users.inviteUser(normalizedEmail, 'user');
      } catch (inviteErr) {
        console.log('Invite skipped:', inviteErr.message);
      }
    }

    // Trigger the platform's password reset email
    let resetSent = false;
    try {
      await base44.auth.resetPasswordRequest(normalizedEmail);
      resetSent = true;
    } catch (resetErr) {
      console.log('Reset request error:', resetErr.message);
    }

    // Also send a custom notification email via Resend (more reliable delivery)
    try {
      await base44.integrations.Core.SendEmail({
        to: normalizedEmail,
        subject: 'Redefinição de Senha — Portal de Treinamentos Alliage',
        body: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f8fb; padding: 24px;">
            <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,59,92,0.08);">
              <div style="background: linear-gradient(135deg, #003B5C, #00A6D6); padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 20px; margin: 0;">Portal de Treinamentos Alliage</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #003B5C; font-size: 18px; margin: 0 0 16px;">Redefinição de Senha</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  Olá,
                </p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  ${platformUserExists
                    ? 'Recebemos uma solicitação para redefinir sua senha de acesso ao Portal de Treinamentos Alliage.'
                    : 'Seu acesso foi liberado! Para começar a usar o portal, você precisa definir sua senha.'}
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${baseUrl}/forgot-password"
                     style="display: inline-block; background: #00A6D6; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 9999px; text-decoration: none;">
                    Redefinir minha senha
                  </a>
                </div>
                <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                  Se o botão acima não funcionar, acesse diretamente: <a href="${baseUrl}/forgot-password" style="color: #00A6D6;">${baseUrl}/forgot-password</a>
                </p>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin-top: 24px;">
                  Se você não solicitou esta redefinição, ignore este email.<br/>
                  © ${new Date().getFullYear()} Alliage — Training & Education
                </p>
              </div>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.log('Custom email send error:', emailErr.message);
    }

    return Response.json({
      success: true,
      account_exists: platformUserExists,
      reset_triggered: resetSent,
      message: platformUserExists
        ? 'Email de redefinição de senha enviado com sucesso!'
        : 'Convite enviado! O usuário receberá um email para definir sua senha.'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});