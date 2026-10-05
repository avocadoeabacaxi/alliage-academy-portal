import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testDataDir = mkdtempSync(join(tmpdir(), 'alliage-registration-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test', DATA_DIR: testDataDir, UPLOADS_DIR: join(testDataDir, 'uploads'),
  JWT_SECRET: 'registration-test-secret-not-for-production',
  EMAIL_DRY_RUN: 'true', SCHEDULER_ENABLED: 'false', RESEND_API_KEY: '',
});
const { config } = await import('../config.mjs');
const dbModule = await import('../db.mjs');
const { db, createRecord, getRecord, getAccountByEmail, listRecords } = dbModule;
const { invokeFunction } = await import('../functions.mjs');
const { signAccessToken } = await import('../security.mjs');
const { server } = await import('../index.mjs');
const originalFetch = globalThis.fetch;
const profile = { full_name: 'Pessoa de teste', email: 'cadastro@example.com', phone: '5511999990000', preferred_language: 'pt' };
let origin;
let sentMessages;

before(async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  db.exec('DELETE FROM records; DELETE FROM accounts; DELETE FROM auth_codes; DELETE FROM email_log;');
  sentMessages = [];
  // Only the local HTTP server is reachable; all provider sends are captured.
  globalThis.fetch = async (url, options) => {
    if (url === 'https://api.resend.com/emails') {
      sentMessages.push(JSON.parse(options.body));
      return Response.json({ id: `mock-email-${sentMessages.length}` });
    }
    if (String(url).startsWith(`${origin}/`)) return originalFetch(url, options);
    throw new Error('External network disabled in registration tests');
  };
  config.emailDryRun = false;
  config.resendApiKey = 'test-only-not-a-real-key';
  createRecord('User', { id: 'admin-registration', email: 'admin@example.com', full_name: 'Admin Teste', role: 'admin', receive_access_request_emails: true });
});

after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise(resolve => server.close(resolve));
  db.close();
  rmSync(testDataDir, { recursive: true, force: true });
});

async function request(path, payload, token) {
  const response = await fetch(`${origin}${path}`, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  return { status: response.status, body: await response.json() };
}

test('campos visíveis no cadastro bastam para solicitar acesso, sem empresa', async () => {
  const result = await invokeFunction('requestAccess', { ...profile, full_name: ' Pessoa de teste ', email: ' CADASTRO@EXAMPLE.COM ', phone: ' 5511999990000 ', role: 'admin', status: 'approved' });
  assert.equal(result.success, true);
  assert.equal(result.status, 'pending');
  const [authorization] = listRecords('UserAuthorization');
  assert.equal(authorization.full_name, profile.full_name);
  assert.equal(authorization.email, profile.email);
  assert.equal(authorization.phone, profile.phone);
  assert.equal(authorization.role, 'solicitante');
  assert.equal(authorization.status, 'pending');
  assert.equal(authorization.company_type, undefined);
  assert.equal(authorization.company_name, undefined);
  assert.equal(getAccountByEmail(profile.email), undefined);
  assert.equal(sentMessages.length, 1);
  assert.deepEqual(sentMessages[0].to, ['admin@example.com']);
  assert.doesNotMatch(sentMessages[0].html, /Empresa:/);
});

test('nome, e-mail e WhatsApp continuam obrigatórios e erro identifica o campo', async () => {
  for (const [key, label] of [['full_name', 'nome completo'], ['email', 'e-mail'], ['phone', 'celular (WhatsApp)']]) {
    for (const value of [undefined, null, '', '   ', {}, 123]) {
      await assert.rejects(invokeFunction('requestAccess', { ...profile, [key]: value }), error => error.status === 400 && error.message.includes(label));
    }
  }
  assert.equal(listRecords('UserAuthorization').length, 0);
  assert.equal(sentMessages.length, 0);
});

test('empresa é opcional e clientes antigos ainda podem informá-la com escape no e-mail', async () => {
  await invokeFunction('requestAccess', { ...profile, company_type: 'Distribuidor', company_name: '<Empresa>' });
  assert.equal(listRecords('UserAuthorization')[0].company_name, '<Empresa>');
  assert.match(sentMessages[0].html, /Distribuidor — &lt;Empresa&gt;/);
  assert.doesNotMatch(sentMessages[0].html, /<Empresa>/);
});

test('prévia do cadastro não cria registros nem envia notificações', async () => {
  assert.deepEqual(await invokeFunction('requestAccess', { ...profile, dry_run: true }), { success: true, dry_run: true });
  assert.equal(listRecords('UserAuthorization').length, 0);
  assert.equal(sentMessages.length, 0);
});

test('repetir cadastro não sobrescreve decisões, dados ou permissões existentes', async () => {
  for (const status of ['pending', 'approved', 'rejected']) {
    const email = `${status}@example.com`;
    const existing = createRecord('UserAuthorization', { ...profile, email, status, role: 'educador', company_name: 'Histórico' });
    const result = await invokeFunction('requestAccess', { ...profile, email, full_name: 'Alterado', role: 'admin', status: 'approved' });
    assert.equal(result.success, false);
    assert.equal(result.status, status);
    assert.deepEqual(getRecord('UserAuthorization', existing.id), existing);
  }
  assert.equal(sentMessages.length, 0);
});

test('cadastro com senha confirma e-mail e aguarda aprovação administrativa', async () => {
  const password = 'Senha-de-teste-123';
  const missingAuthorization = await request('/api/auth/register', { email: profile.email, password });
  assert.equal(missingAuthorization.status, 403);
  const access = await request('/api/functions/requestAccess', profile);
  assert.equal(access.status, 200);
  assert.equal(access.body.data.status, 'pending');
  const register = await request('/api/auth/register', { email: profile.email, password });
  assert.equal(register.status, 200);
  assert.equal(getAccountByEmail(profile.email).email_verified, 0);
  const beforeVerification = await request('/api/auth/login', { email: profile.email, password });
  assert.equal(beforeVerification.status, 403);
  const verificationEmail = sentMessages.find(message => message.to.includes(profile.email) && /código de verificação/.test(message.subject));
  const otpCode = verificationEmail.html.match(/>(\d{6})<\//)?.[1];
  assert.ok(otpCode, 'OTP enviado ao provedor simulado');
  const verified = await request('/api/auth/verify-otp', { email: profile.email, otpCode });
  assert.equal(verified.status, 200);
  assert.ok(verified.body.access_token);
  assert.equal(verified.body.user.authorization_status, 'pending');
  assert.equal(verified.body.user.role, 'solicitante');
  const denied = await request('/api/entities/TrainingRequest', undefined, verified.body.access_token);
  assert.equal(denied.status, 403);
  const [authorization] = listRecords('UserAuthorization');
  const selfApproval = await request('/api/functions/updateUserAuthorization', { id: authorization.id, status: 'approved' }, verified.body.access_token);
  assert.equal(selfApproval.status, 403);
  dbModule.upsertAccount({ id: 'admin-registration', email: 'admin@example.com', emailVerified: true });
  createRecord('UserAuthorization', { email: 'admin@example.com', role: 'admin', status: 'approved' });
  const adminToken = signAccessToken({ id: 'admin-registration', email: 'admin@example.com' });
  const approved = await request('/api/functions/updateUserAuthorization', { id: authorization.id, status: 'approved' }, adminToken);
  assert.equal(approved.status, 200);
  const allowed = await request('/api/entities/TrainingRequest', undefined, verified.body.access_token);
  assert.equal(allowed.status, 200);
});

test('pedido de acesso usado pelo Google não exige empresa nem aprova automaticamente', async () => {
  const access = await request('/api/functions/requestAccess', { ...profile, email: 'google-cadastro@example.com' });
  assert.equal(access.status, 200);
  assert.equal(access.body.data.success, true);
  const [authorization] = listRecords('UserAuthorization');
  assert.equal(authorization.status, 'pending');
  assert.equal(authorization.role, 'solicitante');
  assert.equal(getAccountByEmail('google-cadastro@example.com'), undefined);
});
