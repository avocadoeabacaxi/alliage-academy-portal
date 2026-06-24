import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_type, product_name, training_focus, training_request_id, request_id_display } = await req.json();

    const focusText = typeof training_focus === 'object'
      ? (training_focus.pt || training_focus.en || training_focus.es || '')
      : (training_focus || '');

    const prompt = `You are creating a satisfaction survey for a corporate training session at Alliage (medical devices). Based on the training details below, generate 6-8 relevant questions in Portuguese (pt), English (en), and Spanish (es).

Training Type: ${request_type}
Product: ${product_name}
Training Focus: ${focusText}

Guidelines:
- Include 1 overall satisfaction question (rating 1-5)
- Include questions about content quality, instructor effectiveness, practical application, and knowledge improvement
- Include 1 open-ended question for suggestions
- Each question must have all 3 language versions
- Question types: "rating" (1-5 scale) or "text" (open-ended)

Return a JSON object with a "questions" array.`;

    const result = await base44.integrations.Core.InvokeLLM({
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

    const public_token = crypto.randomUUID();
    const survey = await base44.entities.SatisfactionSurvey.create({
      training_request_id,
      request_id_display: request_id_display || '',
      questions: result.questions,
      public_token,
      is_active: true
    });

    return Response.json({ survey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});