export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test((value || '').trim());

export const isValidPhone = (value) => ((value || '').replace(/\D/g, '').length >= 8);

export const emailHint = (lang) => ({
  pt: 'Informe um email válido (ex.: nome@empresa.com)',
  en: 'Enter a valid email (e.g. name@company.com)',
  es: 'Ingrese un email válido (ej.: nombre@empresa.com)'
}[lang] || 'Informe um email válido (ex.: nome@empresa.com)');

export const phoneHint = (lang) => ({
  pt: 'Informe um telefone válido com DDD',
  en: 'Enter a valid phone number',
  es: 'Ingrese un teléfono válido'
}[lang] || 'Informe um telefone válido com DDD');