export const hasOther = value => Array.isArray(value) ? value.includes('Outro') : value === 'Outro';

export const validOtherDetail = (selection, detail) => !hasOther(selection)
  || (typeof detail === 'string' && detail.trim().length > 0);

export const validOtherFields = (form, fields) => fields.every(field => validOtherDetail(form[field], form[`${field}_detail`]));

// Keep drafts while toggling in the UI, but never persist hidden/stale details.
export function otherDetailsPayload(form, fields) {
  return Object.fromEntries(fields.map(field => [`${field}_detail`,
    hasOther(form[field]) ? String(form[`${field}_detail`] || '').trim() : '',
  ]));
}

export const cleanProductDetails = products => products.map(product => ({
  ...product, ...otherDetailsPayload(product, ['category', 'brand']),
}));

export function describeOtherOption(value, detail, translate = value => value) {
  const label = translate(value);
  return value === 'Outro' && detail ? `${label}: ${detail}` : label;
}
