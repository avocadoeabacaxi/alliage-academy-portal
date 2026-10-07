import { alliage } from '@/api/alliageClient';

export async function inviteAuthorizedUser({ email, role, region, full_name, preferred_language }) {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await alliage.functions.invoke('authorizeEmailInvitation', { email: normalizedEmail, role, region, full_name, preferred_language });
  if (response.data?.error) throw new Error(response.data.error);
  // Confirm the persisted decision before reporting success or sending a link.
  const confirmation = await alliage.functions.invoke('listUserAuthorizations', {});
  const authorization = confirmation.data?.data?.find(item => item.email?.trim().toLowerCase() === normalizedEmail);
  if (authorization?.status !== 'approved' || authorization.role !== role) {
    throw new Error('Não foi possível confirmar a aprovação. Atualize a lista e verifique o status antes de tentar novamente.');
  }
  // O convite de plataforma é opcional: usuários que já se cadastraram sozinhos não precisam dele.
  try {
    await alliage.users.inviteUser(normalizedEmail, role === 'admin' ? 'admin' : 'user');
    return { authorization, notificationError: null };
  } catch (e) {
    console.warn('Convite de plataforma não enviado:', e?.message);
    return { authorization, notificationError: 'O acesso foi aprovado, mas o envio do convite falhou. Use Enviar convite / Redefinir senha para tentar novamente.' };
  }
}
