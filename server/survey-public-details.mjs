import { requestKind } from './request-kinds.mjs';

const text = value => typeof value === 'string' ? value : '';
function localizedText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return Object.fromEntries(['pt', 'en', 'es'].filter(lang => typeof value[lang] === 'string').map(lang => [lang, value[lang]]));
}

// Public survey links expose only the context participants need. Never spread
// the request or product objects: they may contain internal notes/contact data.
export function publicSurveyRequest(request) {
  if (!request) return null;
  return {
    id: request.id,
    request_id: text(request.request_id),
    request_kind: requestKind(request),
    request_type: text(request.request_type),
    request_type_detail: text(request.request_type_detail),
    product_name: text(request.product_name),
    product_category: text(request.product_category),
    products: (Array.isArray(request.products) ? request.products : []).filter(product => product && typeof product === 'object').map(product => ({
      category: text(product.category), category_detail: text(product.category_detail),
      brand: text(product.brand), brand_detail: text(product.brand_detail),
    })),
    training_focus: localizedText(request.training_focus),
  };
}
