import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validParticipants, validTrainingLogistics, trainingLogisticsPayload } from '../../src/lib/trainingRegistration.js';
import { translations } from '../../src/lib/i18n/translations.js';
import { preparePastRegistration } from '../past-registration.mjs';

const participant = { name: 'Pessoa Teste', email: 'participant@example.com', phone: '' };
const online = { guest_participation_mode: 'Online', online_platform: 'Google Meet', online_access_link: '', needs_educator_link: false, format: 'Presencial', presencial_mode: 'local', format_details: 'Realizado' };
const testDataDir = mkdtempSync(join(tmpdir(), 'alliage-past-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test', DATA_DIR: testDataDir, UPLOADS_DIR: join(testDataDir, 'uploads'),
  JWT_SECRET: 'past-registration-test-secret-32-characters', EMAIL_DRY_RUN: 'true',
  RESEND_API_KEY: '', AI_API_KEY: '', SCHEDULER_ENABLED: 'false',
});
let server, dbModule, token, origin;
const networkFetch = globalThis.fetch;
before(async () => {
  dbModule = await import('../db.mjs');
  const { signAccessToken } = await import('../security.mjs');
  ({ server } = await import('../index.mjs'));
  const account = dbModule.upsertAccount({ email: 'admin@example.com', emailVerified: true });
  dbModule.createRecord('User', { email: account.email, role: 'admin', full_name: 'Teste' });
  dbModule.createRecord('UserAuthorization', { email: account.email, role: 'admin', status: 'approved' });
  token = signAccessToken(account);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = (url, options) => {
    if (!String(url).startsWith(`${origin}/`)) throw new Error('External network disabled');
    return networkFetch(url, options);
  };
});
after(async () => {
  globalThis.fetch = networkFetch;
  await new Promise(resolve => server.close(resolve));
  dbModule.db.close();
  rmSync(testDataDir, { recursive: true, force: true });
});

test('participante anterior exige nome e e-mail; telefone opcional mas válido se informado', () => {
  assert.equal(validParticipants([participant], true), true);
  assert.equal(validParticipants([participant], false), false);
  for (const patch of [{ name: '' }, { email: '' }, { email: 'invalid' }, { phone: '123' }]) {
    assert.equal(validParticipants([{ ...participant, ...patch }], true), false);
    assert.throws(() => preparePastRegistration({ status: 'Concluído', participants_list: [{ ...participant, ...patch }] }), /Informe nome/);
  }
  assert.equal(validParticipants([{ ...participant, phone: '+55 11 99999-9999' }], false), true);
  assert.equal(preparePastRegistration({ status: 'Concluído', participants_list: [participant] }).participants_list[0].phone, '');
});

test('online anterior só exige plataforma e elimina campos de link; nova solicitação mantém regra', () => {
  assert.equal(validTrainingLogistics(online, true), true);
  assert.equal(validTrainingLogistics(online, false), false);
  assert.equal(validTrainingLogistics({ ...online, online_platform: '' }, true), false);
  assert.equal(validTrainingLogistics({ ...online, needs_educator_link: true }, false), true);
  const t = key => translations.pt[key];
  const payload = trainingLogisticsPayload({ ...online, needs_educator_link: true, online_access_link: 'https://example.com/old' }, true, t);
  assert.equal(payload.format, 'Remoto');
  assert.equal(payload.format_details, 'Realizado');
  assert.equal(payload.online_access_link, '');
  assert.equal(payload.needs_educator_link, false);
  assert.equal(payload.registration_mode, 'past');
});

test('presencial anterior usa passado em todos os idiomas e mantém endereço para visita', () => {
  for (const lang of ['pt', 'en', 'es']) {
    const t = key => translations[lang][key];
    for (const mode of ['local', 'ribeirao']) {
      const form = { ...online, guest_participation_mode: 'Presencial', presencial_mode: mode };
      const key = mode === 'local' ? 'presencialModeLocal' : 'presencialModeRibeirao';
      assert.ok(trainingLogisticsPayload(form, true, t).format_details.startsWith(t(`form.past.${key}`)));
      assert.ok(trainingLogisticsPayload(form, false, t).format_details.startsWith(t(`form.${key}`)));
      assert.equal(validTrainingLogistics(form, true), mode === 'ribeirao');
      assert.equal(validTrainingLogistics({ ...form, location_country: 'Brasil', location_city: 'Campinas' }, true), true);
    }
    assert.ok(t('form.past.participantsListHint'));
  }
});

test('API aceita telefone vazio, persiste registro concluído e gera só pesquisa simulada', async () => {
  const response = await fetch(`${origin}/api/entities/TrainingRequest`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Concluído', requester_email: 'requester@example.com', participants_list: [participant], training_completed_date: '2026-11-01', needs_educator_link: true, online_access_link: 'https://example.com/old' }),
  });
  assert.equal(response.status, 201);
  const record = await response.json();
  assert.equal(record.registration_mode, 'past');
  assert.equal(record.online_access_link, '');
  assert.equal(record.needs_educator_link, false);
  assert.equal(dbModule.getRecord('TrainingRequest', record.id).participants_list[0].phone, '');
  // Wait only for the local asynchronous automation, with external fetch blocked.
  for (let i = 0; i < 50 && dbModule.db.prepare('SELECT COUNT(*) n FROM email_log').get().n < 2; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(dbModule.db.prepare('SELECT email_type, status FROM email_log').all().map(row => ({ ...row })), [
    { email_type: 'survey', status: 'dry_run' }, { email_type: 'survey', status: 'dry_run' },
  ]);
});

test('API rejeita participante sem e-mail antes de gravar ou disparar mensagem', async () => {
  const before = dbModule.listRecords('TrainingRequest').length;
  const response = await fetch(`${origin}/api/entities/TrainingRequest`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Concluído', participants_list: [{ ...participant, email: '' }] }),
  });
  assert.equal(response.status, 400);
  assert.equal(dbModule.listRecords('TrainingRequest').length, before);
});

test('registro interno de envio não pode ser lido ou alterado pela API genérica', async () => {
  for (const method of ['GET', 'POST']) {
    const response = await fetch(`${origin}/api/entities/SurveyDelivery`, { method, headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 404);
  }
});
