import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email } = await req.json();

    // Check if user is authorized
    const auths = await base44.asServiceRole.entities.UserAuthorization.filter({ email });
    const auth = auths.length > 0 ? auths[0] : null;

    if (!auth) {
      return Response.json({ authorized: false, status: 'not_found' });
    }

    if (auth.status === 'pending') {
      return Response.json({ authorized: false, status: 'pending' });
    }

    if (auth.status === 'rejected') {
      return Response.json({ authorized: false, status: 'rejected', reason: auth.rejection_reason });
    }

    // Update last login
    await base44.asServiceRole.entities.UserAuthorization.update(auth.id, {
      last_login: new Date().toISOString()
    });

    return Response.json({ authorized: true, status: 'approved' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});