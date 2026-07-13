import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

const DEFAULT_SURVEY_SUBJECT = '[Reenvio] 📋 Pesquisa de Satisfação - Treinamento ${request_id}';
const DEFAULT_SURVEY_HTML = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; background: #FEF3C7; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 32px;">📋</div></div><h2 style="color: #003B5C; margin-top: 0; text-align: center; font-size: 24px;">Pesquisa de Satisfação - Lembrete</h2><p style="color: #6B7280; line-height: 1.6; text-align: center;">Olá \${requester_name},</p><p style="color: #6B7280; line-height: 1.6;">Estamos reenviando o convite para que você complete sua avaliação do treinamento realizado. Sua opinião é muito importante para melhorarmos continuamente nossos programas.</p><div style="background: #F3F4F6; border-left: 4px solid #00A6D6; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>Solicitação:</strong> \${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> \${product_name}</p></div><div style="margin: 30px 0; text-align: center;"><a href="\${survey_url}" style="display: inline-block; padding: 12px 32px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">Responder Pesquisa</a></div><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Esta pesquisa é confidencial e seus dados serão usados apenas para melhorias no programa.</p></div></div>`;

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll('${' + key + '}', value ?? '');
  }
  return result;
}

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

    // Always use the SatisfactionSurvey token — the /survey/:token page resolves only these
    const surveys = await base44.asServiceRole.entities.SatisfactionSurvey.filter({ training_request_id });
    const validToken = surveys[0]?.public_token || public_token;
    const surveyUrl = `https://trainning.alliage.global/survey/${validToken}`;

    // Fetch configured email template from database
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ template_type: 'survey' });
    const tpl = templates.length > 0 ? templates[0] : null;

    const tplVars = {
      request_id: request_id_display,
      requester_name: request.requester_name,
      requester_email: request.requester_email,
      product_name: request.product_name,
      survey_url: surveyUrl
    };

    const subject = fillTemplate(tpl?.subject || DEFAULT_SURVEY_SUBJECT, tplVars);
    const html = fillTemplate(tpl?.html_content || DEFAULT_SURVEY_HTML, tplVars);

    // Send via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const result = await resend.emails.send({
      from: 'no-reply@trainning.alliage.global',
      to: request.requester_email,
      subject,
      html
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Increment resend count on the evaluation record
    try {
      const evals = await base44.asServiceRole.entities.TrainingEvaluation.filter({ training_request_id });
      if (evals.length > 0) {
        const ev = evals[0];
        await base44.asServiceRole.entities.TrainingEvaluation.update(ev.id, {
          resend_count: (ev.resend_count || 0) + 1,
          last_resent_at: new Date().toISOString(),
          status: 'sent'
        });
      }
    } catch (e) {
      console.error('Could not update resend count:', e);
    }

    return Response.json({ success: true, email_id: result.data.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});