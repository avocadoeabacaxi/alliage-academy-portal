import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const authorizations = await base44.asServiceRole.entities.UserAuthorization.filter({ email: user.email.toLowerCase(), status: 'approved' });
    const appRole = user.role === 'admin' ? 'admin' : authorizations[0]?.role;
    if (!['admin', 'gerente_regional', 'educador'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const records = await base44.asServiceRole.entities.UserAuthorization.list('-created_date', 500);
    return Response.json({ data: records });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});