import { base44 } from '@/api/base44Client';

export async function inviteAuthorizedUser({ email, role, region, full_name, preferred_language }) {
  const normalizedEmail = email.trim().toLowerCase();
  await base44.functions.invoke('authorizeEmailInvitation', { email: normalizedEmail, role, region, full_name, preferred_language });
  const existingUsers = await base44.entities.User.filter({ email: normalizedEmail });
  if (existingUsers.length === 0) {
    await base44.users.inviteUser(normalizedEmail, role === 'admin' ? 'admin' : 'user');
  }
}