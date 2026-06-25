import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { training_request_id, request_id_display, public_token } = await req.json();

    // Get training request details
    const request = await base44.asServiceRole.entities.TrainingRequest.get(training_request_id);
    if (!request) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    const surveyUrl = `${new URL(req.url).origin}/survey/${public_token}`;

    // Send via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: request.requester_email,
      subject: `[Reenvio] Pesquisa de Satisfação - Treinamento ${request_id_display}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B5C; margin-bottom: 20px;">Pesquisa de Satisfação - Lembrete</h2>
          <p>Olá ${request.requester_name},</p>
          <p>Estamos reenviando o convite para que você complete sua avaliação do treinamento realizado. Sua opinião é muito importante para melhorarmos continuamente nossos programas.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${surveyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">
              Responder Pesquisa
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Esta pesquisa é confidencial e seus dados serão usados apenas para melhorias no programa.
          </p>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    return Response.json({ success: true, email_id: result.data.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});