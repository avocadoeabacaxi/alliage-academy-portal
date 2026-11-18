import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicSurveyRequest } from '../survey-public-details.mjs';
import { surveyProductRows } from '../../src/lib/surveyDetails.js';
import { translations } from '../../src/lib/i18n/translations.js';

test('pesquisa pública preserva pares tipo/marca e foco, sem justificativa ou dados internos', () => {
  const request = { id: 'test', request_id: 'TR-TEST', request_type: 'Técnico avançado',
    product_name: 'Dabi, Dabi', product_category: 'Scanner Intraoral',
    products: [{ category: 'Scanner Intraoral', brand: 'Dabi', serial_number: 'PRIVATE' }, { category: 'Consultórios', brand: 'Dabi' }],
    training_focus: { pt: 'Fluxo de trabalho', en: 'Workflow', es: 'Flujo de trabajo', private: 'SECRET' },
    justification: { pt: 'INTERNAL JUSTIFICATION' }, requester_email: 'private@example.com',
    requester_phone: 'PRIVATE', participants_list: [{ email: 'private@example.com' }], execution_notes: 'INTERNAL' };
  const data = publicSurveyRequest(request);
  assert.deepEqual(Object.keys(data).sort(), ['id', 'request_id', 'request_kind', 'request_type', 'request_type_detail', 'product_name', 'product_category', 'products', 'training_focus'].sort());
  assert.deepEqual(data.training_focus, { pt: 'Fluxo de trabalho', en: 'Workflow', es: 'Flujo de trabajo' });
  assert.deepEqual(surveyProductRows(data), [{ category: 'Scanner Intraoral', brand: 'Dabi' }, { category: 'Consultórios', brand: 'Dabi' }]);
  assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  assert.ok(!JSON.stringify(data).includes('INTERNAL'));
  assert.ok(!JSON.stringify(data).includes('SECRET'));
});

test('detalhes Outro e foco do apoio técnico permanecem legíveis', () => {
  const data = publicSurveyRequest({ request_kind: 'support', request_type: 'Outro', request_type_detail: 'Instalação',
    products: [{ category: 'Outro', category_detail: 'Equipamento customizado', brand: 'Outro', brand_detail: 'Marca customizada' }], training_focus: 'Configurar o equipamento' });
  assert.equal(data.request_kind, 'support');
  assert.equal(data.request_type_detail, 'Instalação');
  assert.equal(data.training_focus, 'Configurar o equipamento');
  assert.deepEqual(surveyProductRows(data), [{ category: 'Equipamento customizado', brand: 'Marca customizada' }]);
});

test('registros legados usam produto/categoria existentes sem recorrer à justificativa', () => {
  const data = publicSurveyRequest({ product_name: 'Saevo', product_category: 'Extraoral', justification: 'Não publicar' });
  assert.deepEqual(surveyProductRows(data), [{ category: 'Extraoral', brand: 'Saevo' }]);
  assert.equal(data.training_focus, '');
  assert.equal(data.justification, undefined);
  assert.equal(publicSurveyRequest(null), null);
  assert.deepEqual(surveyProductRows(publicSurveyRequest({})), [{ category: '—', brand: '—' }]);
});

test('novos rótulos da pesquisa existem em português, inglês e espanhol', () => {
  for (const lang of ['pt', 'en', 'es']) for (const key of ['activityDetails', 'productType', 'productBrand', 'activityType', 'activityFocus']) {
    assert.ok(translations[lang][`survey.${key}`]);
  }
});
