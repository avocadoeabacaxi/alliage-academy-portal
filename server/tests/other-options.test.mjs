import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasOther, validOtherDetail, validOtherFields, otherDetailsPayload, cleanProductDetails, describeOtherOption } from '../../src/lib/otherOptions.js';
import { validTrainingLogistics, trainingLogisticsPayload } from '../../src/lib/trainingRegistration.js';
import { emptySupportForm, validSupportStep, supportPayload } from '../../src/lib/technicalSupport.js';
import { translations } from '../../src/lib/i18n/translations.js';

test('Outro abre detalhe para seleção única/múltipla; vazio e espaços não bastam', () => {
  for (const selection of ['Outro', ['Capacitação', 'Outro']]) {
    assert.equal(hasOther(selection), true);
    for (const detail of ['', '   ', undefined, null]) assert.equal(validOtherDetail(selection, detail), false);
    assert.equal(validOtherDetail(selection, 'Descrição específica'), true);
  }
  for (const selection of [undefined, '', [], 'Novo treinamento', ['Capacitação']]) {
    assert.equal(hasOther(selection), false);
    assert.equal(validOtherDetail(selection, ''), true);
  }
});

test('problemas e impactos têm detalhes independentes, sem bloquear quando Outro está desmarcado', () => {
  const fields = ['specific_problems', 'expected_impacts'];
  const form = { specific_problems: ['Capacitação', 'Outro'], specific_problems_detail: 'Descrição do problema', expected_impacts: ['Outro'], expected_impacts_detail: '' };
  assert.equal(validOtherFields(form, fields), false);
  form.expected_impacts_detail = 'Impacto esperado';
  assert.equal(validOtherFields(form, fields), true);
  form.specific_problems = ['Capacitação'];
  assert.deepEqual(otherDetailsPayload(form, fields), { specific_problems_detail: '', expected_impacts_detail: 'Impacto esperado' });
  assert.equal(form.specific_problems_detail, 'Descrição do problema', 'rascunho preservado ao alternar');
});

test('público, objetivos e demais opções de evento seguem a mesma validação e limpeza', () => {
  for (const field of ['event_type', 'alliage_role', 'who_invited', 'audience', 'strategic_objectives', 'expected_impacts']) {
    const form = { [field]: ['Outro'], [`${field}_detail`]: '  Complemento do evento  ' };
    assert.equal(validOtherFields(form, [field]), true);
    assert.equal(otherDetailsPayload(form, [field])[`${field}_detail`], 'Complemento do evento');
    assert.equal(validOtherFields({ ...form, [`${field}_detail`]: '' }, [field]), false);
    assert.equal(otherDetailsPayload({ ...form, [field]: [] }, [field])[`${field}_detail`], '');
  }
});

test('apoio técnico mantém Outro no tipo e valida categoria e marca personalizadas', () => {
  const form = { ...emptySupportForm(), request_type: 'Outro', description: 'Descrição de suporte técnico para teste.' };
  assert.equal(validSupportStep(form, 2, {}), false);
  form.request_type_detail = 'Tipo personalizado';
  assert.equal(validSupportStep(form, 2, {}), true);
  form.products = [{ category: 'Outro', category_detail: '', brand: 'Outro', brand_detail: 'Marca de teste' }];
  assert.equal(validSupportStep(form, 1, { Outro: ['Outro'] }), false);
  form.products[0].category_detail = 'Categoria de teste';
  assert.equal(validSupportStep(form, 1, { Outro: ['Outro'] }), true);
  const payload = supportPayload(form, 'pt', 'TR-OTHER-TEST', ['Marca de teste']);
  assert.equal(payload.request_type_detail, 'Tipo personalizado');
  assert.equal(payload.products[0].category_detail, 'Categoria de teste');
  assert.equal(cleanProductDetails([{ ...form.products[0], category: 'Extraoral', brand: 'Saevo' }])[0].category_detail, '');
  assert.equal(cleanProductDetails([{ ...form.products[0], category: 'Extraoral', brand: 'Saevo' }])[0].brand_detail, '');
});

test('plataforma Outro exige descrição em treinamento atual/anterior e preserva regra de link', () => {
  const form = { guest_participation_mode: 'Online', online_platform: 'Outro', online_platform_detail: '', online_access_link: 'https://example.com/room' };
  for (const isPast of [false, true]) {
    assert.equal(validTrainingLogistics(form, isPast), false);
    assert.equal(validTrainingLogistics({ ...form, online_platform_detail: 'Webex' }, isPast), true);
    assert.equal(trainingLogisticsPayload({ ...form, online_platform_detail: ' Webex ' }, isPast, key => key).online_platform_detail, 'Webex');
    assert.equal(trainingLogisticsPayload({ ...form, online_platform: 'Zoom', online_platform_detail: 'Webex' }, isPast, key => key).online_platform_detail, '');
  }
  assert.equal(validTrainingLogistics({ ...form, online_platform_detail: 'Webex', online_access_link: '' }, false), false);
  assert.equal(validTrainingLogistics({ ...form, online_platform_detail: 'Webex', online_access_link: '' }, true), true);
});

test('detalhes exibem descrição sem alterar valor canônico; rótulos existem nos três idiomas', () => {
  assert.equal(describeOtherOption('Outro', 'Tipo local'), 'Outro: Tipo local');
  assert.equal(describeOtherOption('Outro', '', () => 'Other'), 'Other');
  assert.equal(describeOtherOption('Reciclagem', 'Texto antigo'), 'Reciclagem');
  for (const lang of ['pt', 'en', 'es']) for (const key of ['otherProblemDetail', 'otherImpactDetail', 'otherAudienceDetail', 'otherCategoryDetail', 'otherPlatformDetail']) {
    assert.ok(translations[lang][`form.${key}`]);
  }
});

const testDataDir = mkdtempSync(join(tmpdir(), 'alliage-other-test-'));
Object.assign(process.env, { NODE_ENV: 'test', DATA_DIR: testDataDir, UPLOADS_DIR: join(testDataDir, 'uploads'),
  JWT_SECRET: 'other-options-tests-only-secret-32chars', EMAIL_DRY_RUN: 'true', RESEND_API_KEY: '', AI_API_KEY: '', SCHEDULER_ENABLED: 'false' });
let server, dbModule, origin;
const tokens = {};
const realFetch = globalThis.fetch;
before(async () => {
  dbModule = await import('../db.mjs');
  const { signAccessToken } = await import('../security.mjs');
  ({ server } = await import('../index.mjs'));
  for (const role of ['admin', 'solicitante']) {
    const account = dbModule.upsertAccount({ email: `${role}@example.com`, emailVerified: true });
    dbModule.createRecord('User', { email: account.email, full_name: 'Pessoa Teste', role });
    dbModule.createRecord('UserAuthorization', { email: account.email, role, status: 'approved' });
    tokens[role] = signAccessToken(account);
  }
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = (url, options) => {
    if (!String(url).startsWith(`${origin}/`)) throw new Error('External network disabled');
    return realFetch(url, options);
  };
});
after(async () => {
  globalThis.fetch = realFetch;
  await new Promise(resolve => server.close(resolve));
  dbModule.db.close();
  rmSync(testDataDir, { recursive: true, force: true });
});

const call = async (path, method, body, role = 'admin') => {
  const response = await fetch(`${origin}/api/entities/TrainingRequest${path}`, { method,
    headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
};

test('API salva e recupera todos os detalhes em registros atuais e anteriores sem mudar etapas', async () => {
  for (const kind of ['training', 'support', 'event']) for (const status of ['Pendente Análise', 'Concluído']) {
    const payload = {
      request_kind: kind, request_category: kind === 'event' ? 'Evento' : 'Treinamento / Apoio Técnico', status,
      request_type: 'Outro', request_type_detail: 'Tipo personalizado', requester_email: 'solicitante@example.com',
      specific_problems: ['Capacitação', 'Outro'], specific_problems_detail: 'Problema com acentuação\ne segunda linha',
      expected_impacts: ['Outro'], expected_impacts_detail: 'Impacto personalizado', audience: ['Outro'], audience_detail: 'Público personalizado',
      strategic_objectives: ['Outro'], strategic_objectives_detail: 'Objetivo personalizado',
      online_platform: 'Outro', online_platform_detail: 'Webex', products: [{ category: 'Outro', category_detail: 'Categoria especial', brand: 'Outro', brand_detail: 'Marca especial' }],
    };
    const created = await call('', 'POST', payload);
    assert.equal(created.status, 201);
    const read = await call(`/${created.data.id}`, 'GET');
    for (const [key, value] of Object.entries(payload)) assert.deepEqual(read.data[key], value, key);
    if (status === 'Pendente Análise') assert.equal(read.data.decision_stage1, 'Pendente');
  }
  assert.equal(dbModule.db.prepare("SELECT COUNT(*) n FROM email_log WHERE status <> 'dry_run'").get().n, 0);
});

test('solicitante edita apenas a descrição da plataforma do próprio pedido; permissões continuam restritas', async () => {
  const own = dbModule.createRecord('TrainingRequest', { status: 'Concluído', requester_email: 'solicitante@example.com', guest_participation_mode: 'Online', online_platform: 'Outro' });
  const emailsBefore = dbModule.db.prepare('SELECT COUNT(*) n FROM email_log').get().n;
  const edit = await call(`/${own.id}`, 'PATCH', { online_platform_detail: 'Plataforma local' }, 'solicitante');
  assert.equal(edit.status, 200);
  assert.equal(edit.data.online_platform_detail, 'Plataforma local');
  assert.equal(edit.data.status, 'Concluído');
  assert.equal((await call(`/${own.id}`, 'PATCH', { online_platform_detail: 'Texto', status: 'Aprovado Etapa 2' }, 'solicitante')).status, 403);
  const other = dbModule.createRecord('TrainingRequest', { status: 'Concluído', requester_email: 'other@example.com' });
  assert.equal((await call(`/${other.id}`, 'PATCH', { online_platform_detail: 'Texto' }, 'solicitante')).status, 403);
  assert.equal(dbModule.db.prepare('SELECT COUNT(*) n FROM email_log').get().n, emailsBefore);
});
