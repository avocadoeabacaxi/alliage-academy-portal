import { base44 } from '@/api/base44Client';

export async function inviteAuthorizedUser({ email, role, region, full_name, preferred_language }) {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await base44.functions.invoke('authorizeEmailInvitation', { email: normalizedEmail, role, region, full_name, preferred_language });
  if (!response.data?.user_exists) {
    await base44.users.inviteUser(normalizedEmail, role === 'admin' ? 'admin' : 'user');
  }
}