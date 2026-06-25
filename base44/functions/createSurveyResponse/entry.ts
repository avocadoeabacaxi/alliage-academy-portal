import { createClient } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { survey_id, training_request_id, respondent_name, responses, language, rating_overall, submitted_at } = await req.json();

    // Create service role client without request auth
    const base44 = createClient({ role: 'service' });
    const response = await base44.entities.SurveyResponse.create({
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