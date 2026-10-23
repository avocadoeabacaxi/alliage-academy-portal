import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptySupportForm, validSupportStep, supportPayload, safeSupportLink } from '../../src/lib/technicalSupport.js';
import { requestKind } from '../request-kinds.mjs';

const testDataDir = mkdtempSync(join(tmpdir(), 'alliage-support-follow-up-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test', DATA_DIR: testDataDir, UPLOADS_DIR: join(testDataDir, 'uploads'),
  JWT_SECRET: 'support-follow-up-test-secret-32-characters', EMAIL_DRY_RUN: 'true',
  RESEND_API_KEY: '', SCHEDULER_ENABLED: 'false', SUPER_ADMIN_EMAIL: 'admin@example.com',
});
let dbModule, server, origin;
const tokens = {};
const brands = { Extraoral: ['Saevo', 'Outro'] };
const sampleForm = () => ({ ...emptySupportForm(), requester_name: 'Pessoa Teste', requester_email: 'support@example.com',
  requester_phone: '+55 (11) 99999-9999', company_name: 'Empresa de teste', region_detail: 'São Paulo',
  products: [{ category: 'Extraoral', brand: 'Saevo' }], description: 'Preciso de orientação técnica sobre o produto.' });

const call = async (path, role = 'admin', method = 'GET', body) => {
  const response = await fetch(`${origin}${path}`, { method,
    headers: { ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};
const endpoint = id => `/api/requests/${id}/follow-ups`;
const entry = (comment = 'Orientação complementar registrada.', key = 'submission-test-0001') => ({ comment, submission_id: key });

before(async () => {
  dbModule = await import('../db.mjs');
  const { signAccessToken } = await import('../security.mjs');
  ({ server } = await import('../index.mjs'));
  for (const role of ['admin', 'educador', 'gerente_regional', 'solicitante', 'pending']) {
    const account = dbModule.upsertAccount({ id: role, email: `${role}@example.com`, emailVerified: true });
    dbModule.createRecord('User', { id: role, email: account.email, full_name: `Teste ${role}`, role });
    dbModule.createRecord('UserAuthorization', { email: account.email, role: role === 'pending' ? 'educador' : role, status: role === 'pending' ? 'pending' : 'approved' });
    tokens[role] = signAccessToken(account);
  }
  for (const [id, data] of Object.entries({
    completed: { status: 'Concluído' }, historical: { status: 'Concluído' },
    executed: { status: 'Aprovado Etapa 2', training_completed_date: '2026-10-01' },
    pending: { status: 'Pendente Análise' }, cancelled: { status: 'Cancelado', training_completed_date: '2026-10-01' },
    rejected: { status: 'Rejeitado' }, event: { status: 'Concluído', request_category: 'Evento' },
    support: { status: 'Concluído', request_type: 'Apoio técnico' },
    otherSupport: { status: 'Concluído', request_kind: 'support', request_type: 'Outro' },
  })) dbModule.createRecord('TrainingRequest', { id, request_type: 'Novo treinamento', requester_email: 'solicitante@example.com', ...data });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  dbModule.db.close();
  rmSync(testDataDir, { recursive: true, force: true });
});

test('apoio remoto é válido sem convidados, educador, link de reunião ou endereço', () => {
  const form = sampleForm();
  assert.deepEqual([0, 1, 2, 3, 4].map(step => validSupportStep(form, step, brands)), [true, true, true, true, true]);
  const payload = supportPayload(form, 'pt', 'TR-TEST-SUPPORT', ['Saevo']);
  assert.equal(payload.format, 'Remoto');
  assert.equal(requestKind(payload), 'support');
  assert.equal(payload.decision_stage1, 'Pendente');
  assert.equal(payload.requester_phone, '5511999999999');
  for (const key of ['participants_list', 'guest_participation_mode', 'online_access_link', 'needs_educator_link', 'has_multiplier']) assert.equal(key in payload, false);
});

test('apoio exige contato, produto e descrição e valida links seguros', () => {
  for (const key of ['requester_name', 'requester_email', 'requester_phone', 'company_name', 'region_detail']) {
    assert.equal(validSupportStep({ ...sampleForm(), [key]: '' }, 0, brands), false, key);
  }
  assert.equal(validSupportStep({ ...sampleForm(), products: [] }, 1, brands), false);
  assert.equal(validSupportStep({ ...sampleForm(), description: '' }, 2, brands), false);
  assert.equal(validSupportStep({ ...sampleForm(), request_type: 'Outro' }, 2, brands), false);
  assert.equal(validSupportStep({ ...sampleForm(), needs_deadline: true }, 3, brands), false);
  assert.equal(safeSupportLink('javascript:alert(1)'), '');
  assert.equal(safeSupportLink('https://example.com/video'), 'https://example.com/video');
});

test('presencial exige local só para visita e não carrega endereço antigo para remoto', () => {
  const form = { ...sampleForm(), format: 'Presencial' };
  assert.equal(validSupportStep(form, 4, brands), false);
  assert.equal(validSupportStep({ ...form, support_visit_mode: 'ribeirao' }, 4, brands), true);
  Object.assign(form, { location_country: 'Brasil', location_city: 'Campinas', location_street: 'Rua de teste' });
  assert.equal(validSupportStep(form, 4, brands), true);
  assert.equal(supportPayload(form, 'pt', 'TEST', []).location_street, 'Rua de teste');
  assert.equal(supportPayload({ ...form, format: 'Remoto' }, 'pt', 'TEST', []).location_city, '');
  assert.equal(supportPayload({ ...form, support_visit_mode: 'ribeirao' }, 'pt', 'TEST', []).location_street, '');
  assert.equal(requestKind({ request_type: 'Outro', request_kind: 'support' }), 'support');
});

test('ambas as entradas de apoio usam o formulário separado e os demais tipos continuam intactos', () => {
  for (const file of ['TechnicalSupportRequest', 'SolicitacaoSupport']) {
    const source = readFileSync(new URL(`../../src/pages/${file}.jsx`, import.meta.url), 'utf8');
    assert.match(source, /<TechnicalSupportForm/);
    assert.doesNotMatch(source, /<TrainingRequestForm|<Solicitacao /);
  }
  assert.match(readFileSync(new URL('../../src/pages/NewRequest.jsx', import.meta.url), 'utf8'), /<TrainingRequestForm/);
  assert.equal(requestKind({ request_category: 'Evento' }), 'event');
  assert.equal(requestKind({ request_type: 'Novo treinamento' }), 'training');
});

test('API persiste campos do apoio técnico e mantém as etapas de aprovação', async () => {
  const payload = supportPayload({ ...sampleForm(), equipment_model: 'Modelo de teste', equipment_serial: 'TEST-123', attachments: [{ name: 'Foto', url: '/uploads/test.png' }] }, 'pt', 'TR-TEST-SUPPORT', ['Saevo']);
  const result = await call('/api/entities/TrainingRequest', 'solicitante', 'POST', payload);
  assert.equal(result.status, 201);
  const read = await call(`/api/entities/TrainingRequest/${result.body.id}`);
  assert.equal(read.body.equipment_serial, 'TEST-123');
  assert.equal(read.body.request_kind, 'support');
  assert.equal(read.body.status, 'Pendente Análise');
  assert.equal(read.body.decision_stage2, 'Pendente');
  assert.deepEqual(read.body.attachments, payload.attachments);
});

test('acompanhamento é interno, exige sessão aprovada e bloqueia acesso por entidade genérica', async () => {
  assert.equal((await call(endpoint('completed'), 'anonymous')).status, 401);
  for (const role of ['solicitante', 'pending']) {
    assert.equal((await call(endpoint('completed'), role)).status, 403);
    assert.equal((await call(endpoint('completed'), role, 'POST', entry())).status, 403);
  }
  assert.equal((await call('/api/entities/TrainingFollowUp')).status, 404);
  assert.equal((await call('/api/entities/TrainingFollowUp', 'admin', 'POST', entry())).status, 404);
});

test('registra autor e data do servidor sem reabrir pedido ou disparar e-mails', async () => {
  const before = dbModule.getRecord('TrainingRequest', 'completed');
  const emailsBefore = dbModule.db.prepare('SELECT COUNT(*) AS count FROM email_log').get().count;
  for (const role of ['admin', 'educador', 'gerente_regional']) {
    const result = await call(endpoint('completed'), role, 'POST', entry(`Comentário de ${role}`, `submission-for-${role.replaceAll('_', '-')}`));
    assert.equal(result.status, 201);
    assert.equal(result.body.author_email, `${role}@example.com`);
    assert.equal(result.body.created_by_id, role);
    assert.ok(Date.parse(result.body.created_date));
  }
  assert.deepEqual(dbModule.getRecord('TrainingRequest', 'completed'), before);
  assert.equal(dbModule.db.prepare('SELECT COUNT(*) AS count FROM email_log').get().count, emailsBefore);
  const result = await call(endpoint('completed'));
  assert.equal(result.body.items.length, 3);
});

test('permite treinamento histórico/concluído, mas não pendente, cancelado, evento ou apoio', async () => {
  for (const id of ['historical', 'executed']) assert.equal((await call(endpoint(id), 'educador', 'POST', entry())).status, 201);
  for (const id of ['pending', 'cancelled', 'rejected']) assert.equal((await call(endpoint(id), 'educador', 'POST', entry())).status, 409);
  for (const id of ['event', 'support', 'otherSupport']) assert.equal((await call(endpoint(id), 'admin', 'POST', entry())).status, 400);
  assert.equal((await call(endpoint('missing'), 'admin', 'POST', entry())).status, 404);
});

test('rejeita comentário vazio, longo, metadados forjados e alteração/exclusão de histórico', async () => {
  for (const payload of [entry('  '), entry('x'.repeat(5001)), { ...entry(), author_name: 'Outra pessoa' }, { ...entry(), created_date: '2000-01-01' }, { comment: 'Sem identificador' }]) {
    assert.equal((await call(endpoint('completed'), 'admin', 'POST', payload)).status, 400);
  }
  for (const method of ['PATCH', 'DELETE']) assert.equal((await call(endpoint('completed'), 'admin', method, entry())).status, 405);
});

test('tentativas repetidas não duplicam e comentários simultâneos não sobrescrevem', async () => {
  const payload = entry('Primeiro registro.', 'same-submission-1234');
  const a = await call(endpoint('completed'), 'admin', 'POST', payload);
  const b = await call(endpoint('completed'), 'admin', 'POST', payload);
  assert.equal(a.body.id, b.body.id);
  assert.equal((await call(endpoint('completed'), 'admin', 'POST', { ...payload, comment: 'Alterado' })).status, 409);
  const parallel = await Promise.all(['a', 'b'].map(key => call(endpoint('completed'), 'educador', 'POST', entry(`Simultâneo ${key}`, `simultaneous-comment-${key}`))));
  assert.equal(parallel.every(result => result.status === 201), true);
  const result = await call(endpoint('completed'));
  assert.equal(result.body.items.filter(item => item.comment.startsWith('Simultâneo')).length, 2);
  assert.equal(result.body.items.filter(item => item.id === a.body.id).length, 1);
});

test('histórico é paginado sem perder registros e acompanha a exportação', async () => {
  for (let index = 0; index < 56; index++) dbModule.createRecord('TrainingFollowUp', { id: `page-${String(index).padStart(3, '0')}`, training_request_id: 'historical', comment: `Registro ${index}`, created_date: '2026-01-01T12:00:00.000Z' });
  const first = await call(endpoint('historical'));
  assert.equal(first.body.items.length, 50);
  assert.ok(first.body.next_cursor);
  const second = await call(`${endpoint('historical')}?before=${first.body.next_cursor}`);
  assert.equal(second.body.items.length, 7);
  assert.equal(new Set([...first.body.items, ...second.body.items].map(item => item.id)).size, 57);
  assert.equal(second.body.next_cursor, null);
  assert.equal((await call(`${endpoint('completed')}?before=${first.body.next_cursor}`)).status, 400);
  const exported = await call('/api/functions/exportDatabase', 'admin', 'POST', {});
  assert.equal(exported.status, 200);
  assert.ok(exported.body.data.entities.TrainingFollowUp.some(item => item.training_request_id === 'completed'));
});
