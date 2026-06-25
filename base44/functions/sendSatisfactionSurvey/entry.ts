import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { training_request_id, requester_email, requester_name, request_id_display } = await req.json();

    // Get survey
    const surveys = await base44.asServiceRole.entities.SatisfactionSurvey.filter({
      training_request_id
    });

    if (!surveys || surveys.length === 0) {
      return Response.json({ error: 'Survey not found' }, { status: 404 });
    }

    const survey = surveys[0];
    const surveyUrl = `${new URL(req.url).origin}/survey/${survey.public_token}`;

    // Send via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: requester_email,
      subject: `Pesquisa de Satisfação - Treinamento ${request_id_display}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003B5C; margin-bottom: 20px;">Obrigado por participar do nosso treinamento!</h2>
          <p>Olá ${requester_name},</p>
          <p>Gostaríamos de saber sua opinião sobre o treinamento que você participou. Sua resposta nos ajuda a melhorar continuamente nossos programas.</p>
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