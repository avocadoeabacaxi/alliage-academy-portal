import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { languageForRegion, normalizeLanguage } from '../../shared/email.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (admin.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    const { email, role, region, full_name, preferred_language, dry_run } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return Response.json({ error: 'Email is required' }, { status: 400 });
    const registeredUsers = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (dry_run === true) return Response.json({ success: true, dry_run: true, user_exists: registeredUsers.length > 0 });
    const existing = await base44.asServiceRole.entities.UserAuthorization.filter({ email: normalizedEmail });
    const selectedLanguage = normalizeLanguage(preferred_language || existing[0]?.preferred_language || languageForRegion(region));
    const authorization = { email: normalizedEmail, full_name: full_name || existing[0]?.full_name || '', role: role || 'solicitante', region: region || 'Brasil', preferred_language: selectedLanguage, status: 'approved', approved_by: admin.id, approved_date: new Date().toISOString() };
    if (existing.length) await base44.asServiceRole.entities.UserAuthorization.update(existing[0].id, authorization);
    else await base44.asServiceRole.entities.UserAuthorization.create(authorization);
    return Response.json({ success: true, email: normalizedEmail, preferred_language: selectedLanguage, user_exists: registeredUsers.length > 0 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}