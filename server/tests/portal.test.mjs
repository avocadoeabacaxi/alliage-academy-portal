import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testDataDir = mkdtempSync(join(tmpdir(), 'alliage-trainning-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = testDataDir;
process.env.UPLOADS_DIR = join(testDataDir, 'uploads');
process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
process.env.EMAIL_DRY_RUN = 'true';
process.env.SCHEDULER_ENABLED = 'false';
process.env.SUPER_ADMIN_EMAIL = 'admin@example.com';

let origin;
let server;
let dbModule;
let security;

async function request(path, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const body = await response.json();
  return { response, body };
}

before(async () => {
  dbModule = await import('../db.mjs');
  security = await import('../security.mjs');
  ({ server } = await import('../index.mjs'));

  const password = security.hashPassword('Senha-Forte-123');
  const account = dbModule.upsertAccount({
    id: 'admin-test',
    email: 'admin@example.com',
    passwordHash: password.hash,
    passwordSalt: password.salt,
    emailVerified: true,
  });
  dbModule.createRecord('User', { id: account.id, email: account.email, full_name: 'Admin Teste', role: 'admin' });
  dbModule.createRecord('UserAuthorization', { email: account.email, full_name: 'Admin Teste', role: 'admin', region: 'Brasil', status: 'approved' });

  const requesterPassword = security.hashPassword('Senha-Solicitante-123');
  const requester = dbModule.upsertAccount({
    id: 'requester-test',
    email: 'requester@example.com',
    passwordHash: requesterPassword.hash,
    passwordSalt: requesterPassword.salt,
    emailVerified: true,
  });
  dbModule.createRecord('User', { id: requester.id, email: requester.email, full_name: 'Solicitante Teste', role: 'user' });
  dbModule.createRecord('UserAuthorization', { email: requester.email, full_name: 'Solicitante Teste', role: 'solicitante', region: 'Brasil', status: 'approved' });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  dbModule.db.close();
  rmSync(testDataDir, { recursive: true, force: true });
});

test('hash de senha e JWT rejeitam dados incorretos', () => {
  const password = security.hashPassword('segredo');
  assert.equal(security.verifyPassword('segredo', password.salt, password.hash), true);
  assert.equal(security.verifyPassword('errado', password.salt, password.hash), false);
  const token = security.signAccessToken({ id: 'abc', email: 'a@example.com' });
  assert.equal(security.verifyAccessToken(token).sub, 'abc');
  assert.equal(security.verifyAccessToken(`${token}x`), null);
});

test('health check informa integrações em modo seguro', async () => {
  const { response, body } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.application, 'Alliage Trainning');
  assert.equal(body.email.mode, 'dry_run');
});

test('login, perfil e entidades exigem token válido', async () => {
  const unauthorized = await request('/api/entities/TrainingRequest');
  assert.equal(unauthorized.response.status, 401);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'Senha-Forte-123' }),
  });
  assert.equal(login.response.status, 200);
  assert.ok(login.body.access_token);

  const headers = { Authorization: `Bearer ${login.body.access_token}` };
  const me = await request('/api/auth/me', { headers });
  assert.equal(me.body.role, 'admin');
  assert.equal(me.body.authorization_status, 'approved');

  const created = await request('/api/entities/TrainingRequest', {
    method: 'POST',
    headers,
    body: JSON.stringify({ request_id: 'TR-TEST-001', requester_email: 'admin@example.com', status: 'Pendente Análise' }),
  });
  assert.equal(created.response.status, 201);
  const listed = await request('/api/entities/TrainingRequest?sort=-created_date&limit=10', { headers });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body[0].request_id, 'TR-TEST-001');
});

test('solicitante só enxerga a própria solicitação e não altera a aprovação', async () => {
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'requester@example.com', password: 'Senha-Solicitante-123' }),
  });
  const headers = { Authorization: `Bearer ${login.body.access_token}` };
  const created = await request('/api/entities/TrainingRequest', {
    method: 'POST',
    headers,
    body: JSON.stringify({ request_id: 'TR-TEST-REQUESTER', requester_email: 'outra-pessoa@example.com', status: 'Pendente Análise' }),
  });
  assert.equal(created.body.requester_email, 'requester@example.com');

  const listed = await request('/api/entities/TrainingRequest?limit=100', { headers });
  assert.deepEqual(listed.body.map(item => item.id), [created.body.id]);

  const forbidden = await request(`/api/entities/TrainingRequest/${created.body.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'Aprovado Etapa 2' }),
  });
  assert.equal(forbidden.response.status, 403);

  const cancelled = await request(`/api/entities/TrainingRequest/${created.body.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'Cancelado' }),
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.status, 'Cancelado');
});

test('recursos novos usam a API própria e exclusão definitiva fica restrita ao superadministrador', async () => {
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'Senha-Forte-123' }),
  });
  const adminHeaders = { Authorization: `Bearer ${adminLogin.body.access_token}` };
  const training = await request('/api/entities/TrainingRequest', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ request_id: 'TR-TEST-SCHEDULE', requester_email: 'admin@example.com', status: 'Aprovado Etapa 2' }),
  });
  const schedule = await request('/api/entities/TrainingSchedule', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ training_request_id: training.body.id, educator_id: 'admin-test', start_datetime: '2026-09-10T12:00:00.000Z', end_datetime: '2026-09-10T13:00:00.000Z' }),
  });
  assert.equal(schedule.response.status, 201);

  const client = await request('/api/entities/Client', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ name: 'Cliente Teste' }),
  });
  assert.equal(client.response.status, 201);
  assert.equal(client.body.owner_user_id, 'admin-test');

  const exported = await request('/api/functions/exportDatabase', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(exported.response.status, 200);
  assert.ok(exported.body.data.entities.Client.some(item => item.id === client.body.id));

  const requesterLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'requester@example.com', password: 'Senha-Solicitante-123' }),
  });
  const denied = await request(`/api/entities/TrainingRequest/${training.body.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${requesterLogin.body.access_token}` },
  });
  assert.equal(denied.response.status, 403);

  const deleted = await request(`/api/entities/TrainingRequest/${training.body.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert.equal(deleted.response.status, 200);
  const removedSchedule = await request(`/api/entities/TrainingSchedule/${schedule.body.id}`, { headers: adminHeaders });
  assert.equal(removedSchedule.response.status, 404);
});

test('formulário simplificado recebe etapas pendentes e admin pode aprovar em sequência', async () => {
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'Senha-Forte-123' }),
  });
  const headers = { Authorization: `Bearer ${login.body.access_token}` };
  const me = await request('/api/auth/me', { headers });
  assert.equal(me.body.role, 'admin');
  assert.equal(me.body.authorization_status, 'approved');

  // Same incomplete payload that previously hid the approval controls.
  const created = await request('/api/entities/TrainingRequest', {
    method: 'POST', headers,
    body: JSON.stringify({ request_id: 'TR-TEST-WORKFLOW', status: 'Pendente Análise' }),
  });
  assert.equal(created.response.status, 201);
  const path = `/api/entities/TrainingRequest/${created.body.id}`;
  const loaded = await request(path, { headers });
  assert.equal(loaded.body.status, 'Pendente Análise');
  assert.equal(loaded.body.decision_stage1, 'Pendente');
  assert.equal(loaded.body.decision_stage2, 'Pendente');
  assert.equal(loaded.body.date_stage1, undefined);
  assert.equal(loaded.body.date_stage2, undefined);

  const first = await request(path, {
    method: 'PATCH', headers,
    body: JSON.stringify({ decision_stage1: 'Aprovado', status: 'Aprovado Etapa 1', educator_analysis: { pt: 'Análise de teste' } }),
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.body.decision_stage1, 'Aprovado');
  assert.equal(first.body.decision_stage2, 'Pendente');
  const second = await request(path, {
    method: 'PATCH', headers,
    body: JSON.stringify({ decision_stage2: 'Aprovado', status: 'Aprovado Etapa 2', manager_analysis: { pt: 'Análise de teste' } }),
  });
  assert.equal(second.response.status, 200);
  assert.equal(second.body.status, 'Aprovado Etapa 2');
});

test('inicialização preenche etapas vazias sem sobrescrever decisões ou reabrir históricos', async () => {
  const headers = { Authorization: `Bearer ${security.signAccessToken({ id: 'admin-test', email: 'admin@example.com' })}` };
  const cases = [
    { status: 'Pendente Análise', decision_stage1: null, decision_stage2: '' },
    { status: 'Pendente Análise', decision_stage1: 'Pendente', decision_stage2: 'Pendente' },
    { status: 'Aprovado Etapa 1', decision_stage1: 'Aprovado', decision_stage2: 'Pendente' },
    { status: 'Aprovado Etapa 2', decision_stage1: 'Aprovado', decision_stage2: 'Aprovado' },
    { status: 'Concluído', decision_stage1: 'Aprovado', decision_stage2: 'Aprovado' },
    { status: 'Rejeitado', decision_stage1: 'Rejeitado', decision_stage2: 'Pendente' },
    { status: 'Cancelado', decision_stage1: 'Pendente', decision_stage2: 'Pendente' },
    { status: 'Concluído' },
  ];
  for (const [index, input] of cases.entries()) {
    const result = await request('/api/entities/TrainingRequest', {
      method: 'POST', headers,
      body: JSON.stringify({ request_id: `TR-TEST-DEFAULTS-${index}`, ...input }),
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.status, input.status);
    const isPending = input.status === 'Pendente Análise';
    assert.equal(result.body.decision_stage1, isPending ? input.decision_stage1 || 'Pendente' : input.decision_stage1);
    assert.equal(result.body.decision_stage2, isPending ? input.decision_stage2 || 'Pendente' : input.decision_stage2);
  }
});

test('pesquisa pública expõe somente detalhes necessários e aceita token correto', async () => {
  const training = dbModule.createRecord('TrainingRequest', { request_id: 'TR-TEST-002', product_name: 'Produto', request_type: 'Técnico', justification: { pt: 'Teste' } });
  const survey = dbModule.createRecord('SatisfactionSurvey', {
    training_request_id: training.id,
    request_id_display: training.request_id,
    public_token: 'public-test-token',
    is_active: true,
    questions: [{ id: 'overall', type: 'rating', text: { pt: 'Nota?' } }],
  });
  const fetched = await request('/api/functions/getSurveyByToken', {
    method: 'POST',
    body: JSON.stringify({ token: survey.public_token }),
  });
  assert.equal(fetched.response.status, 200);
  assert.equal(fetched.body.data.data.id, survey.id);
  assert.equal(fetched.body.data.training_request.product_name, 'Produto');
  assert.equal(fetched.body.data.training_request.requester_email, undefined);

  const submitted = await request('/api/functions/createSurveyResponse', {
    method: 'POST',
    body: JSON.stringify({
      survey_id: survey.id,
      training_request_id: training.id,
      public_token: survey.public_token,
      responses: [{ question_id: 'overall', answer: 5 }],
      rating_overall: 5,
      language: 'pt',
    }),
  });
  assert.equal(submitted.response.status, 200);
  assert.equal(submitted.body.data.success, true);
});

function requesterHeaders() {
  return { Authorization: `Bearer ${security.signAccessToken({ id: 'requester-test', email: 'requester@example.com' })}` };
}

function requesterTraining(overrides = {}) {
  return dbModule.createRecord('TrainingRequest', {
    requester_email: 'requester@example.com',
    status: 'Pendente Análise', decision_stage1: 'Pendente', decision_stage2: 'Pendente',
    ...overrides,
  });
}

test('solicitante salva acesso e participantes sem modificar o fluxo de aprovação', async () => {
  const training = requesterTraining();
  const path = `/api/entities/TrainingRequest/${training.id}`;
  const headers = requesterHeaders();
  // Same payload as AccessDetailsEditor, including online and physical fields.
  const access = {
    guest_participation_mode: 'Online', online_platform: 'Google Meet',
    online_access_link: '', needs_educator_link: true,
    location_country: 'Brasil', location_city: 'Ribeirão Preto', location_specific: 'Sala 1',
    location_postal_code: '14000-000', location_street: 'Rua de teste', location_number: '10',
    location_complement: '', location_formatted_address: 'Endereço de teste', location_place_id: '',
    training_scheduled_date: '2026-10-06',
  };
  const saved = await request(path, { method: 'PATCH', headers, body: JSON.stringify(access) });
  assert.equal(saved.response.status, 200);
  for (const [key, value] of Object.entries(access)) assert.equal(saved.body[key], value);

  const participants = [{ name: 'Participante de teste', email: 'participante@example.com', phone: '', attendance_mode: 'Online' }];
  const added = await request(path, { method: 'PATCH', headers, body: JSON.stringify({ participants_list: participants }) });
  assert.equal(added.response.status, 200);
  const loaded = await request(path, { headers });
  assert.deepEqual(loaded.body.participants_list, participants);
  assert.equal(loaded.body.training_scheduled_date, access.training_scheduled_date);
  assert.equal(loaded.body.status, training.status);
  assert.equal(loaded.body.decision_stage1, training.decision_stage1);
  assert.equal(loaded.body.decision_stage2, training.decision_stage2);
  assert.equal(loaded.body.requester_email, training.requester_email);
});

test('campos protegidos são rejeitados atomicamente mesmo misturados aos campos permitidos', async () => {
  const training = requesterTraining({ online_platform: 'Google Meet' });
  const path = `/api/entities/TrainingRequest/${training.id}`;
  const protectedFields = {
    status: 'Aprovado Etapa 2', decision_stage1: 'Aprovado', decision_stage2: 'Aprovado',
    date_stage1: '2026-10-02', date_stage2: '2026-10-02', educator_analysis: { pt: 'Indevido' },
    manager_analysis: { pt: 'Indevido' }, educator_id: 'requester-test', manager_id: 'requester-test',
    requester_email: 'outra@example.com', created_by: 'outra@example.com', created_by_id: 'admin-test',
    id: 'outro-id', request_id: 'OUTRO', created_date: '2026-01-01', updated_date: '2026-01-01',
    training_completed_date: '2026-10-02', execution_notes: 'Indevido', final_notes: 'Indevido',
  };
  for (const [key, value] of Object.entries(protectedFields)) {
    const denied = await request(path, {
      method: 'PATCH', headers: requesterHeaders(),
      body: JSON.stringify({ online_platform: 'Zoom', [key]: value }),
    });
    assert.equal(denied.response.status, 403, key);
    assert.match(denied.body.message, /Aprovações e demais campos são restritos/);
    assert.deepEqual(dbModule.getRecord('TrainingRequest', training.id), training, key);
  }
  const mixedCancellation = await request(path, {
    method: 'PATCH', headers: requesterHeaders(),
    body: JSON.stringify({ status: 'Cancelado', participants_list: [] }),
  });
  assert.equal(mixedCancellation.response.status, 403);
  assert.deepEqual(dbModule.getRecord('TrainingRequest', training.id), training);
});

test('solicitante não edita nem assume a propriedade de pedido alheio', async () => {
  const training = requesterTraining({ requester_email: 'outra@example.com', created_by_id: 'admin-test', created_by: 'admin@example.com' });
  for (const payload of [
    { online_platform: 'Zoom' }, { participants_list: [{ name: 'Teste' }] },
    { requester_email: 'requester@example.com', online_platform: 'Zoom' }, { status: 'Cancelado' },
  ]) {
    const denied = await request(`/api/entities/TrainingRequest/${training.id}`, {
      method: 'PATCH', headers: requesterHeaders(), body: JSON.stringify(payload),
    });
    assert.equal(denied.response.status, 403);
    assert.deepEqual(dbModule.getRecord('TrainingRequest', training.id), training);
  }
});

test('identificadores de autoria legados permitem a edição do próprio pedido', async () => {
  for (const owner of [{ created_by_id: 'requester-test' }, { created_by: 'requester@example.com' }, { requester_email: 'requester@example.com' }]) {
    const training = requesterTraining({ requester_email: 'legado@example.com', ...owner });
    const saved = await request(`/api/entities/TrainingRequest/${training.id}`, {
      method: 'PATCH', headers: requesterHeaders(), body: JSON.stringify({ needs_educator_link: true }),
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.body.needs_educator_link, true);
  }
});

test('pedido cancelado não recebe alterações de acesso ou participantes', async () => {
  const training = requesterTraining({ status: 'Cancelado' });
  const path = `/api/entities/TrainingRequest/${training.id}`;
  for (const payload of [{ online_platform: 'Zoom' }, { participants_list: [] }]) {
    const denied = await request(path, { method: 'PATCH', headers: requesterHeaders(), body: JSON.stringify(payload) });
    assert.equal(denied.response.status, 409);
    assert.deepEqual(dbModule.getRecord('TrainingRequest', training.id), training);
  }
  const cancelled = await request(path, { method: 'PATCH', headers: requesterHeaders(), body: JSON.stringify({ status: 'Cancelado' }) });
  assert.equal(cancelled.response.status, 200);
});

test('edição de acesso em pedidos aprovados ou concluídos não reabre fluxo nem repete envios', async () => {
  await new Promise(resolve => setImmediate(resolve));
  const emailsBefore = dbModule.db.prepare('SELECT COUNT(*) AS total FROM email_log').get().total;
  const surveysBefore = dbModule.countRecords().SatisfactionSurvey;
  for (const status of ['Aprovado Etapa 2', 'Concluído']) {
    const training = requesterTraining({ status, decision_stage1: 'Aprovado', decision_stage2: 'Aprovado', date_stage1: '2026-10-01', date_stage2: '2026-10-02' });
    const saved = await request(`/api/entities/TrainingRequest/${training.id}`, {
      method: 'PATCH', headers: requesterHeaders(), body: JSON.stringify({ online_platform: 'Google Meet', participants_list: [{ name: 'Teste' }] }),
    });
    assert.equal(saved.response.status, 200);
    for (const key of ['status', 'decision_stage1', 'decision_stage2', 'date_stage1', 'date_stage2']) assert.equal(saved.body[key], training[key]);
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(dbModule.db.prepare('SELECT COUNT(*) AS total FROM email_log').get().total, emailsBefore);
  assert.equal(dbModule.countRecords().SatisfactionSurvey, surveysBefore);
});

test('atualizações inválidas não corrompem a lista de participantes', async () => {
  const training = requesterTraining({ participants_list: [] });
  for (const payload of [null, [], { participants_list: null }, { participants_list: {} }, { participants_list: [null] }, { participants_list: [{}] }, { participants_list: [{ name: ' ' }] }]) {
    const denied = await request(`/api/entities/TrainingRequest/${training.id}`, {
      method: 'PATCH', headers: requesterHeaders(), body: JSON.stringify(payload),
    });
    assert.equal(denied.response.status, 400);
    assert.deepEqual(dbModule.getRecord('TrainingRequest', training.id), training);
  }
});
