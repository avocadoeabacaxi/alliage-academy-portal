import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

const DEFAULT_SURVEY_SUBJECT = '📋 Pesquisa de Satisfação - Treinamento ${request_id}';
const DEFAULT_SURVEY_HTML = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;"><div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><div style="display: inline-block; background: #DBEAFE; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 32px;">📋</div></div><h2 style="color: #003B5C; margin-top: 0; text-align: center; font-size: 24px;">Pesquisa de Satisfação</h2><p style="color: #6B7280; line-height: 1.6; text-align: center;">Olá \${requester_name}, obrigado por participar do nosso treinamento!</p><div style="background: #F3F4F6; border-left: 4px solid #00A6D6; padding: 16px; margin: 20px 0; border-radius: 4px;"><p style="margin: 8px 0; color: #374151;"><strong>Solicitação:</strong> \${request_id}</p><p style="margin: 8px 0; color: #374151;"><strong>Produto:</strong> \${product_name}</p></div><p style="color: #6B7280; line-height: 1.6;">Gostaríamos de saber sua opinião sobre o treinamento. Sua resposta nos ajuda a melhorar continuamente nossos programas.</p><div style="margin: 30px 0; text-align: center;"><a href="\${survey_url}" style="display: inline-block; padding: 12px 32px; background-color: #00A6D6; color: white; text-decoration: none; border-radius: 24px; font-weight: bold;">Responder Pesquisa</a></div><p style="color: #9CA3AF; font-size: 12px; margin: 0;">Esta pesquisa é confidencial e seus dados serão usados apenas para melhorias no programa.</p></div></div>`;

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

    const { training_request_id, requester_email, requester_name, request_id_display, product_name } = await req.json();

    // Get survey
    const surveys = await base44.asServiceRole.entities.SatisfactionSurvey.filter({ training_request_id });
    if (!surveys || surveys.length === 0) {
      return Response.json({ error: 'Survey not found' }, { status: 404 });
    }

    const survey = surveys[0];
    const appId = Deno.env.get('BASE44_APP_ID');
    const surveyUrl = `https://preview-sandbox--${appId}.base44.app/survey/${survey.public_token}`;

    // Fetch configured email template from database
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ template_type: 'survey' });
    const tpl = templates.length > 0 ? templates[0] : null;

    const subject = fillTemplate(tpl?.subject || DEFAULT_SURVEY_SUBJECT, {
      request_id: request_id_display,
      requester_name,
      product_name,
      survey_url: surveyUrl
    });
    const html = fillTemplate(tpl?.html_content || DEFAULT_SURVEY_HTML, {
      request_id: request_id_display,
      requester_name,
      product_name,
      survey_url: surveyUrl
    });

    // Send via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const result = await resend.emails.send({
      from: 'training@alliageacademy.com',
      to: requester_email,
      subject,
      html
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