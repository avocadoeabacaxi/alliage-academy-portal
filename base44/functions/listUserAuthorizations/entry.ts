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

    const [records, platformUsers] = await Promise.all([
      base44.asServiceRole.entities.UserAuthorization.list('-created_date', 500),
      base44.asServiceRole.entities.User.list('created_date', 500),
    ]);
    const authByEmail = {};
    records.forEach((record) => {
      if (record.email) authByEmail[record.email.toLowerCase()] = record;
    });
    const platformEmails = new Set(platformUsers.map((platformUser) => platformUser.email?.toLowerCase()));
    const users = platformUsers.map((platformUser) => {
      const authorization = authByEmail[platformUser.email?.toLowerCase()];
      return authorization
        ? { ...platformUser, role: authorization.role || platformUser.role, region: authorization.region || platformUser.region || '', authorization_id: authorization.id, status: authorization.status }
        : platformUser;
    });
    records
      .filter((record) => record.status === 'approved' && !platformEmails.has(record.email?.toLowerCase()))
      .forEach((record) => users.push({
        id: `auth_${record.id}`,
        email: record.email,
        full_name: record.full_name || '',
        role: record.role || 'solicitante',
        region: record.region || '',
        created_date: record.approved_date || record.first_login_attempt,
        authorization_id: record.id,
        pending_registration: true,
      }));
    return Response.json({ data: records, users });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});