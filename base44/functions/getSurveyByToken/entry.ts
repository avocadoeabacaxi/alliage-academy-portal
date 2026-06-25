import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Use service role to bypass auth for public surveys
    const surveys = await base44.asServiceRole.entities.SatisfactionSurvey.filter({
      public_token: token
    });

    if (!surveys || surveys.length === 0) {
      return Response.json({ error: 'Survey not found' }, { status: 404 });
    }

    return Response.json({ data: surveys[0] });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});