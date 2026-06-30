import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores' }, { status: 403 });

    const body = await req.json();
    const { email, full_name } = body;
    if (!email) return Response.json({ error: 'Email é obrigatório' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    // Determine the app's base URL from the request origin (the admin's current domain)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/(admin|settings|users).*$/, '') || 'https://trainning.alliage.global';
    const baseUrl = origin.replace(/\/$/, '');

    // Check if a platform user account already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const platformUserExists = existingUsers.length > 0;

    // If the user already has an account, trigger the platform's password reset email (direct /reset-password link)
    if (platformUserExists) {
      try {
        await base44.auth.resetPasswordRequest(normalizedEmail);
      } catch (resetErr) {
        console.log('Reset request error:', resetErr.message);
      }
      return Response.json({
        success: true,
        account_exists: true,
        message: 'Email de redefinição de senha enviado com sucesso!'
      });
    }

    // New user — send a set-password email with a link to self-register
    const setpasswordLink = `${baseUrl}/set-password?email=${encodeURIComponent(normalizedEmail)}`;

    // Send via Resend SDK directly (Core.SendEmail only works for existing app users)
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const result = await resend.emails.send({
      from: 'no-reply@trainning.alliage.global',
      to: normalizedEmail,
      subject: '✅ Acesso Aprovado — Defina sua Senha | Portal de Treinamentos Alliage',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f8fb; padding: 24px;">
          <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,59,92,0.08);">
            <div style="background: linear-gradient(135deg, #003B5C, #00A6D6); padding: 28px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0;">Portal de Treinamentos Alliage</h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 6px 0 0;">Seu acesso foi liberado!</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #003B5C; font-size: 18px; margin: 0 0 16px;">Acesso Aprovado ✅</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Olá${full_name ? ', ' + full_name : ''},
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Seu acesso ao Portal de Treinamentos Alliage foi <strong>aprovado</strong>! Para começar a usar o portal, você precisa definir sua senha de acesso.
              </p>
              <div style="background: #f0f9ff; border-left: 4px solid #00A6D6; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
                <p style="color: #003B5C; font-size: 13px; margin: 0;">
                  <strong>Email cadastrado:</strong> ${normalizedEmail}
                </p>
              </div>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${setpasswordLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #003B5C, #00A6D6); color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 40px; border-radius: 9999px; text-decoration: none;">
                  Definir minha senha
                </a>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                Se o botão acima não funcionar, acesse diretamente:<br/>
                <a href="${setpasswordLink}" style="color: #00A6D6; word-break: break-all;">${setpasswordLink}</a>
              </p>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                Este link é exclusivo para você. Se você não solicitou acesso a este portal, ignore este email.<br/>
                © ${new Date().getFullYear()} Alliage — Training & Education
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return Response.json({ error: 'Falha ao enviar email: ' + result.error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Email de definição de senha enviado com sucesso!'
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});