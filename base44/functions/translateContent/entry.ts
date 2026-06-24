import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { texts, source_lang } = await req.json();
    if (!texts || Object.keys(texts).length === 0) {
      return Response.json({ translations: {} });
    }

    const fieldNames = Object.keys(texts);
    const schemaProps = {};
    for (const f of fieldNames) {
      schemaProps[f] = {
        type: 'object',
        properties: {
          pt: { type: 'string' },
          en: { type: 'string' },
          es: { type: 'string' }
        },
        required: ['pt', 'en', 'es']
      };
    }

    const prompt = `You are a professional translator for a medical device company (Alliage). Translate the following texts from ${source_lang} into Portuguese (pt), English (en), and Spanish (es). Preserve technical terms and product names. Return JSON with translations for each field.

Texts to translate:
${JSON.stringify(texts, null, 2)}

Return a JSON object where each key is the field name and the value is { pt, en, es }.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: schemaProps,
        required: fieldNames
      }
    });

    return Response.json({ translations: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});