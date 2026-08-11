import { base44 } from '@/api/base44Client';

export async function inviteAuthorizedUser({ email, role, region, full_name, preferred_language }) {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await base44.functions.invoke('authorizeEmailInvitation', { email: normalizedEmail, role, region, full_name, preferred_language });
  if (response.data?.error) throw new Error(response.data.error);
  // O convite de plataforma é opcional: usuários que já se cadastraram sozinhos não precisam dele.
  try {
    await base44.users.inviteUser(normalizedEmail, role === 'admin' ? 'admin' : 'user');
  } catch (e) {
    console.warn('Convite de plataforma não enviado:', e?.message);
  }
}