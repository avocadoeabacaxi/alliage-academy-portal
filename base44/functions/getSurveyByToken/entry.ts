import { createClient } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Create service role client without request auth
    const base44 = createClient({ role: 'service' });
    const surveys = await base44.entities.SatisfactionSurvey.filter({
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