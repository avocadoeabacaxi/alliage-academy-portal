import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if user already has an authorization record
    const existing = await base44.asServiceRole.entities.UserAuthorization.filter({
      email: user.email
    });

    if (existing.length === 0) {
      // Create pending authorization for first-time user
      await base44.asServiceRole.entities.UserAuthorization.create({
        email: user.email,
        full_name: user.full_name,
        role: 'solicitante',
        status: 'pending',
        first_login_attempt: new Date().toISOString()
      });
      return Response.json({ created: true, status: 'pending' });
    }

    return Response.json({ created: false, status: existing[0].status });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});