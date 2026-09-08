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
