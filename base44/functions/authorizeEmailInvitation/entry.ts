import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (admin.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { email, role, region, full_name } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return Response.json({ error: 'Email is required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.UserAuthorization.filter({ email: normalizedEmail });
    const authorization = {
      email: normalizedEmail,
      full_name: full_name || '',
      role: role || 'solicitante',
      region: region || 'Brasil',
      status: 'approved',
      approved_by: admin.id,
      approved_date: new Date().toISOString()
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.UserAuthorization.update(existing[0].id, authorization);
    } else {
      await base44.asServiceRole.entities.UserAuthorization.create(authorization);
    }

    return Response.json({ success: true, email: normalizedEmail });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});