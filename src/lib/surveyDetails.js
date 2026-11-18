export function surveyProductRows(request, translate = value => value) {
  const products = Array.isArray(request.products) ? request.products : [];
  if (!products.length) return [{ category: translate(request.product_category) || '—', brand: request.product_name || '—' }];
  return products.map(product => ({
    category: product.category === 'Outro' && product.category_detail ? product.category_detail : translate(product.category) || '—',
    brand: product.brand === 'Outro' && product.brand_detail ? product.brand_detail : translate(product.brand) || '—',
  }));
}
