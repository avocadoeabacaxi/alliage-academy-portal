import { base44 } from '@/api/base44Client';

export async function inviteAuthorizedUser({ email, role, region, full_name }) {
  await base44.functions.invoke('authorizeEmailInvitation', { email, role, region, full_name });
  await base44.users.inviteUser(email.trim().toLowerCase(), role === 'admin' ? 'admin' : 'user');
}