import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { survey_id, training_request_id, respondent_name, responses, language, rating_overall, submitted_at } = await req.json();

    const base44 = createClientFromRequest(req);
    const response = await base44.asServiceRole.entities.SurveyResponse.create({
      survey_id,
      training_request_id,
      respondent_name,
      responses,
      language,
      rating_overall,
      submitted_at
    });

    return Response.json({ success: true, response_id: response.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});