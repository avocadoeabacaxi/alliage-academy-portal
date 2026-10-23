import { isValidEmail, isValidPhone } from './validation.js';
import { supportTypes } from './requestTypeLabels.js';

export function safeSupportLink(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export const emptySupportForm = () => ({
  requester_name: '', requester_email: '', requester_phone: '', company_name: '',
  region: 'Brasil', region_detail: '', products: [{ category: 'Extraoral', brand: '', brand_detail: '' }],
  equipment_model: '', equipment_serial: '', request_type: 'Apoio técnico', request_type_detail: '',
  description: '', attachments: [], support_reference_url: '', priority: 'Média',
  needs_deadline: false, deadline_requested: '', deadline_reason: '', format: 'Remoto',
  support_visit_mode: 'local', format_details: '', location_country: '', location_city: '',
  location_postal_code: '', location_specific: '', location_street: '', location_number: '',
  location_complement: '', location_formatted_address: '', location_place_id: '',
});

export function validSupportStep(form, step, brandsByCategory) {
  const text = key => typeof form[key] === 'string' && form[key].trim();
  switch (step) {
    case 0: return Boolean(text('requester_name') && isValidEmail(form.requester_email) && isValidPhone(form.requester_phone)
      && text('company_name') && form.region && (form.region === 'USA' || text('region_detail')));
    case 1: return form.products.length > 0 && form.products.every(p => p.category in brandsByCategory
      && (!brandsByCategory[p.category].length || brandsByCategory[p.category].includes(p.brand))
      && (p.brand !== 'Outro' || p.brand_detail?.trim()));
    case 2: return Boolean([...supportTypes, 'Outro'].includes(form.request_type)
      && (form.request_type !== 'Outro' || text('request_type_detail'))
      && text('description').length >= 10
      && (!text('support_reference_url') || safeSupportLink(form.support_reference_url)));
    case 3: return ['Baixa', 'Média', 'Alta'].includes(form.priority) && (!form.needs_deadline || Boolean(text('deadline_requested')));
    case 4: return form.format === 'Remoto' || (form.format === 'Presencial'
      && (form.support_visit_mode === 'ribeirao' || Boolean(text('location_country') && text('location_city'))));
    default: return false;
  }
}

export function supportPayload(form, lang, requestId, productNames, translations = {}) {
  const { description, needs_deadline, ...data } = form;
  const onsite = form.format === 'Presencial';
  const payload = {
    ...data,
    requester_name: form.requester_name.trim(), requester_email: form.requester_email.trim().toLowerCase(),
    requester_phone: form.requester_phone.replace(/\D/g, ''), company_name: form.company_name.trim(),
    request_id: requestId, request_kind: 'support', request_category: 'Treinamento / Apoio Técnico',
    product_name: productNames.join(', '), product_category: form.products[0]?.category || '',
    status: 'Pendente Análise', decision_stage1: 'Pendente', decision_stage2: 'Pendente',
    original_language: lang,
    training_focus: translations.description || { [lang]: description.trim() },
    justification: translations.description || { [lang]: description.trim() },
    deadline_requested: needs_deadline ? form.deadline_requested : '',
    deadline_reason: translations.deadline_reason || { [lang]: form.deadline_reason.trim() },
    support_reference_url: safeSupportLink(form.support_reference_url),
    support_visit_mode: onsite ? form.support_visit_mode : '',
  };
  // Do not carry a previous visit address into a remote or office visit request.
  if (!onsite || form.support_visit_mode === 'ribeirao') {
    for (const key of Object.keys(payload)) if (key.startsWith('location_')) payload[key] = '';
  }
  return payload;
}
