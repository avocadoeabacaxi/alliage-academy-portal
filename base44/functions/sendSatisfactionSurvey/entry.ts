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
    const body = await req.json();

    // Resolve training request — supports entity-automation payload ({ event, data, old_data }) and direct calls
    let request = null;
    if (body?.event?.entity_name === 'TrainingRequest') {
      request = body.data || await base44.asServiceRole.entities.TrainingRequest.get(body.event.entity_id);
      // Only fire when the request has just been completed
      if (request?.status !== 'Concluído') {
        return Response.json({ skipped: true, reason: 'status is not Concluído' });
      }
      if (body.old_data && body.old_data.status === 'Concluído') {
        return Response.json({ skipped: true, reason: 'already completed before' });
      }
    } else if (body?.training_request_id) {
      request = await base44.asServiceRole.entities.TrainingRequest.get(body.training_request_id);
    }

    if (!request) {
      return Response.json({ error: 'Training request not found' }, { status: 404 });
    }
    if (!request.requester_email) {
      return Response.json({ error: 'No requester email on request' }, { status: 400 });
    }

    const training_request_id = request.id;

    // Find existing personalized survey — or generate one (unique questions per training, stored)
    const existing = await base44.asServiceRole.entities.SatisfactionSurvey.filter({ training_request_id });
    let survey = existing[0] || null;

    if (!survey) {
      const focusText = typeof request.training_focus === 'object'
        ? (request.training_focus?.pt || request.training_focus?.en || request.training_focus?.es || '')
        : (request.training_focus || '');

      const prompt = `You are creating a satisfaction survey for a corporate training session at Alliage (medical devices). Based on the training details below, generate 6-8 relevant questions in Portuguese (pt), English (en), and Spanish (es).

Training Type: ${request.request_type || '—'}
Product: ${request.product_name || '—'}
Training Focus: ${focusText}

Guidelines:
- Include 1 overall satisfaction question (rating 1-5)
- Include questions about content quality, instructor effectiveness, practical application, and knowledge improvement
- Include 1 open-ended question for suggestions
- Each question must have all 3 language versions
- Question types: "rating" (1-5 scale) or "text" (open-ended)

Return a JSON object with a "questions" array.`;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: {
                    type: 'object',
                    properties: {
                      pt: { type: 'string' },
                      en: { type: 'string' },
                      es: { type: 'string' }
                    },
                    required: ['pt', 'en', 'es']
                  },
                  type: { type: 'string', enum: ['rating', 'text'] }
                },
                required: ['id', 'text', 'type']
              }
            }
          },
          required: ['questions']
        }
      });

      survey = await base44.asServiceRole.entities.SatisfactionSurvey.create({
        training_request_id,
        request_id_display: request.request_id || '',
        questions: result.questions,
        public_token: crypto.randomUUID(),
        is_active: true
      });
    }

    const surveyUrl = `https://training.alliage.global/survey/${survey.public_token}`;

    // Keep the TrainingEvaluation report record in sync (same token as the survey)
    const evals = await base44.asServiceRole.entities.TrainingEvaluation.filter({ training_request_id });
    if (evals.length === 0) {
      await base44.asServiceRole.entities.TrainingEvaluation.create({
        training_request_id,
        request_id_display: request.request_id || '',
        educator_name: request.educator_name || 'A Definir',
        educator_id: request.educator_id,
        product_name: request.product_name || '—',
        training_date: request.training_completed_date || request.training_scheduled_date,
        questions: survey.questions,
        status: 'sent',
        public_token: survey.public_token,
        sent_at: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.TrainingEvaluation.update(evals[0].id, {
        status: evals[0].status === 'completed' ? 'completed' : 'sent',
        public_token: survey.public_token,
        sent_at: new Date().toISOString()
      });
    }

    // Fetch configured email template from database
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ template_type: 'survey' });
    const tpl = templates.length > 0 ? templates[0] : null;

    const tplVars = {
      request_id: request.request_id || '',
      requester_name: request.requester_name || '',
      product_name: request.product_name || '',
      survey_url: surveyUrl
    };

    const subject = fillTemplate(tpl?.subject || DEFAULT_SURVEY_SUBJECT, tplVars);
    const html = fillTemplate(tpl?.html_content || DEFAULT_SURVEY_HTML, tplVars);

    const recipients = [request.requester_email, ...(request.participants_list || []).map((participant) => participant?.email)]
      .filter((email) => email?.includes('@'));
    const uniqueRecipients = [...new Set(recipients.map((email) => email.toLowerCase()))];
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const results = await Promise.all(uniqueRecipients.map((email) => resend.emails.send({
      from: 'no-reply@training.alliage.global',
      to: email,
      subject,
      html
    })));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error('Resend error:', failed.error);
      return Response.json({ error: failed.error.message }, { status: 500 });
    }

    return Response.json({ success: true, emails_sent: uniqueRecipients.length, survey_url: surveyUrl });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});