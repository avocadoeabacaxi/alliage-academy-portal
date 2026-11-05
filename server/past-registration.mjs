// Only called on creation. Existing completed records are never replayed.
export function preparePastRegistration(payload) {
  if (payload.status !== 'Concluído') return payload;
  const participants = payload.participants_list ?? [];
  if (!Array.isArray(participants) || participants.some(p =>
    !p || typeof p.name !== 'string' || !p.name.trim()
    || typeof p.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(p.email.trim())
    || (p.phone != null && (typeof p.phone !== 'string' || (p.phone.trim() && p.phone.replace(/\D/g, '').length < 8)))
  )) {
    throw Object.assign(new Error('Informe nome e e-mail válidos para cada participante. O telefone é opcional; se preenchido, deve ser válido.'), { status: 400 });
  }
  return {
    ...payload,
    registration_mode: 'past',
    online_access_link: '',
    needs_educator_link: false,
    participants_list: participants.map(p => ({ ...p, name: p.name.trim(), email: p.email.trim().toLowerCase(), phone: p.phone?.trim() || '' })),
  };
}
