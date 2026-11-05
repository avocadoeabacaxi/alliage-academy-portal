import { isValidEmail, isValidPhone } from './validation.js';

export function validParticipants(participants = [], isPast = false) {
  return participants.every(p => Boolean(p.name?.trim() && isValidEmail(p.email)
    && ((isPast && !p.phone?.trim()) || isValidPhone(p.phone))));
}

export function validTrainingLogistics(form, isPast = false) {
  if (form.guest_participation_mode === 'Online') {
    return isPast ? Boolean(form.online_platform) : Boolean(form.online_access_link || form.needs_educator_link);
  }
  return form.presencial_mode === 'ribeirao' || Boolean(form.location_country?.trim() && form.location_city?.trim());
}

export function trainingLogisticsPayload(form, isPast, t) {
  const online = form.guest_participation_mode === 'Online';
  const modeKey = form.presencial_mode === 'ribeirao' ? 'presencialModeRibeirao' : 'presencialModeLocal';
  return {
    format: online ? 'Remoto' : form.guest_participation_mode,
    format_details: online ? form.format_details : [t(`form.${isPast ? 'past.' : ''}${modeKey}`), form.format_details].filter(Boolean).join(' — '),
    ...(isPast ? { registration_mode: 'past', online_access_link: '', needs_educator_link: false } : {}),
  };
}
