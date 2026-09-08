import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testDataDir = mkdtempSync(join(tmpdir(), 'alliage-email-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = testDataDir;
process.env.UPLOADS_DIR = join(testDataDir, 'uploads');
process.env.EMAIL_DRY_RUN = 'true';
process.env.SCHEDULER_ENABLED = 'false';

const { config } = await import('../config.mjs');
const { db, createRecord, getRecord, listRecords, updateRecord, getJobRun } = await import('../db.mjs');
const { sendEmail } = await import('../mailer.mjs');
const { ensureSurvey, notifyAdminNewRequest, sendSatisfactionSurvey, sendParticipantReminders, invokeFunction } = await import('../functions.mjs');
const { runScheduledJobs } = await import('../scheduler.mjs');
const originalFetch = globalThis.fetch;
const message = { emailType: 'qa', to: 'tester@example.com', subject: 'Teste local', html: '<p>Teste</p>' };
const admin = { id: 'admin', email: 'admin@example.com', role: 'admin' };
const accepted = () => Response.json({ id: 'provider-test-id' });

beforeEach(() => {
  db.exec('DELETE FROM records; DELETE FROM email_log; DELETE FROM job_runs;');
  config.emailDryRun = true;
  config.resendApiKey = '';
  config.aiApiKey = '';
  config.appOrigin = 'https://training.alliage.global';
  config.emailFrom = 'Alliage Trainning <no-reply@training.alliage.global>';
  config.schedulerEnabled = true;
  config.schedulerHour = 0;
  globalThis.fetch = async () => { throw new Error('Network disabled in email tests'); };
});
afterEach(() => { globalThis.fetch = originalFetch; });
after(() => {
  db.close();
  rmSync(testDataDir, { recursive: true, force: true });
});

function enableSending() {
  config.emailDryRun = false;
  config.resendApiKey = 'test-only-key';
}

function training(extra = {}) {
  return createRecord('TrainingRequest', {
    requester_email: 'requester@example.com', requester_name: 'Pessoa Teste',
    request_id: 'TR-TEST', status: 'Aprovado Etapa 2', product_name: 'Produto',
    training_scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    participants_list: [{ email: 'participant@example.com', name: 'Participante' }],
    ...extra,
  });
}

function evaluation(request) {
  return listRecords('TrainingEvaluation', { filters: { training_request_id: request.id }, limit: 1 })[0];
}

test('simulação não chama o Resend e não é aceita como envio', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return accepted(); };
  const result = await sendEmail({ ...message, to: [' Tester@Example.com ', 'tester@example.com'] });
  assert.equal(result.dryRun, true);
  assert.equal(result.accepted, false);
  assert.equal(called, false);
  const log = db.prepare('SELECT * FROM email_log').get();
  assert.equal(log.status, 'dry_run');
  assert.deepEqual(JSON.parse(log.recipients), ['tester@example.com']);
});

test('chave ausente com disparos habilitados gera erro explícito', async () => {
  config.emailDryRun = false;
  await assert.rejects(sendEmail(message), /Resend não configurado/);
  assert.equal(db.prepare('SELECT status FROM email_log').get().status, 'error');
});

test('aceitação requer identificador e usa timeout e chave de idempotência', async () => {
  enableSending();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.ok(options.signal instanceof AbortSignal);
    assert.match(options.headers['Idempotency-Key'], /^alliage\//);
    assert.equal(JSON.parse(options.body).from, config.emailFrom);
    return accepted();
  };
  assert.equal((await sendEmail(message)).accepted, true);
  assert.equal(db.prepare('SELECT status FROM email_log').get().status, 'sent');
});

test('retentativa após limite de envio reaproveita corpo e idempotência', async () => {
  enableSending();
  const attempts = [];
  globalThis.fetch = async (_, options) => {
    attempts.push(options);
    return attempts.length === 1 ? Response.json({ message: 'rate limit' }, { status: 429, headers: { 'retry-after': '0' } }) : accepted();
  };
  await sendEmail(message);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].headers['Idempotency-Key'], attempts[1].headers['Idempotency-Key']);
  assert.equal(attempts[0].body, attempts[1].body);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM email_log').get().n, 1);
});

test('erro HTTP definitivo e resposta incompleta não viram sucesso', async () => {
  enableSending();
  globalThis.fetch = async () => Response.json({ message: 'Domínio inválido' }, { status: 403 });
  await assert.rejects(sendEmail(message), /Domínio inválido/);
  globalThis.fetch = async () => Response.json({});
  await assert.rejects(sendEmail(message), /sem identificador/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM email_log WHERE status = 'error'").get().n, 2);
});

test('falha de rede é limitada, registrada e não expõe credenciais', async () => {
  enableSending();
  let attempts = 0;
  globalThis.fetch = async () => { attempts += 1; throw new Error('Network failed'); };
  await assert.rejects(sendEmail(message), /não pôde ser confirmado/);
  assert.equal(attempts, 3);
  assert.equal(db.prepare('SELECT status FROM email_log').get().status, 'error');
});

test('modelo importado resolve origin para link absoluto do novo portal', async () => {
  enableSending();
  createRecord('EmailTemplate', { template_type: 'admin_notification', subject: '${request_id}', html_content: '<a href="${origin}/requests/${request_id}">Revisar</a><a href="${origin}/requests">Todas</a>' });
  let payload;
  globalThis.fetch = async (_, options) => { payload = JSON.parse(options.body); return accepted(); };
  const request = training();
  await notifyAdminNewRequest(request);
  assert.match(payload.html, /href="https:\/\/training\.alliage\.global\/requests"/);
  assert.ok(payload.html.includes(`href="https://training.alliage.global/requests/${request.id}"`));
  assert.equal(payload.subject, request.request_id);
  assert.ok(!payload.html.includes('/requests/TR-TEST'));
  assert.ok(!payload.html.includes('${'));
});

test('criar ou simular pesquisa mantém status pendente e não marca data de envio', async () => {
  const request = training();
  await ensureSurvey(request);
  assert.equal(evaluation(request).status, 'pending');
  const result = await sendSatisfactionSurvey(request);
  assert.equal(result.dry_run, true);
  assert.equal(result.emails_sent, 0);
  assert.equal(evaluation(request).status, 'pending');
  assert.equal(evaluation(request).sent_at, undefined);
});

test('falha na pesquisa não altera status ou data para enviada', async () => {
  enableSending();
  const request = training();
  globalThis.fetch = async () => Response.json({ message: 'Rejected' }, { status: 403 });
  await assert.rejects(sendSatisfactionSurvey(request), /Rejected/);
  assert.equal(evaluation(request).status, 'pending');
  assert.equal(evaluation(request).sent_at, undefined);
});

test('pesquisa só recebe data de envio após os destinatários serem aceitos', async () => {
  enableSending();
  const request = training();
  globalThis.fetch = async () => accepted();
  const result = await sendSatisfactionSurvey(request);
  assert.equal(result.emails_sent, 2);
  assert.equal(evaluation(request).status, 'sent');
  assert.ok(evaluation(request).sent_at);
});

test('reenvio simulado preserva pesquisa respondida, data e contador', async () => {
  const request = training();
  await ensureSurvey(request);
  const existing = evaluation(request);
  updateRecord('TrainingEvaluation', existing.id, { status: 'completed', resend_count: 2, sent_at: '2026-01-01T00:00:00.000Z' });
  const result = await invokeFunction('resendSurveyEmail', { training_request_id: request.id }, admin);
  assert.equal(result.dry_run, true);
  assert.equal(result.emails_sent, 0);
  assert.equal(evaluation(request).status, 'completed');
  assert.equal(evaluation(request).resend_count, 2);
  assert.equal(evaluation(request).sent_at, '2026-01-01T00:00:00.000Z');
});

test('reenvio real incrementa contador sem reabrir pesquisa concluída', async () => {
  enableSending();
  const request = training();
  await ensureSurvey(request);
  updateRecord('TrainingEvaluation', evaluation(request).id, { status: 'completed' });
  globalThis.fetch = async () => accepted();
  const result = await invokeFunction('resendSurveyEmail', { training_request_id: request.id }, admin);
  assert.equal(result.emails_sent, 1);
  assert.equal(evaluation(request).status, 'completed');
  assert.equal(evaluation(request).resend_count, 1);
});

test('lembretes e agendador não consomem envios no modo de teste', async () => {
  const request = training();
  const result = await sendParticipantReminders();
  assert.equal(result.dry_run, true);
  assert.equal(result.trainings_to_notify, 1);
  assert.equal(result.emails_sent, 0);
  assert.equal(getRecord('TrainingRequest', request.id).reminder_sent, undefined);
  assert.equal((await runScheduledJobs()).reason, 'email-disabled');
  assert.equal(getJobRun('participant-reminders'), undefined);
});

test('prévia explícita continua segura mesmo com Resend habilitado', async () => {
  enableSending();
  const request = training();
  assert.equal((await sendParticipantReminders({ dryRun: true })).emails_sent, 0);
  assert.equal(getRecord('TrainingRequest', request.id).reminder_sent, undefined);
});

test('lembrete parcialmente falho retoma só os destinatários pendentes', async () => {
  enableSending();
  const request = training({ participants_list: [{ email: 'first@example.com' }, { email: 'second@example.com' }] });
  const recipients = [];
  let rejectSecond = true;
  globalThis.fetch = async (_, options) => {
    const recipient = JSON.parse(options.body).to[0];
    recipients.push(recipient);
    return rejectSecond && recipient === 'second@example.com' ? Response.json({ message: 'Rejected' }, { status: 403 }) : accepted();
  };
  await assert.rejects(sendParticipantReminders(), /Rejected/);
  assert.equal(getRecord('TrainingRequest', request.id).reminder_sent, undefined);
  assert.deepEqual(getRecord('TrainingRequest', request.id).reminder_sent_recipients, ['first@example.com']);
  rejectSecond = false;
  const result = await sendParticipantReminders();
  assert.equal(result.emails_sent, 1);
  assert.equal(getRecord('TrainingRequest', request.id).reminder_sent, true);
  assert.deepEqual(recipients, ['first@example.com', 'second@example.com', 'second@example.com']);
});

test('envio administrativo de acesso informa quando foi apenas simulado', async () => {
  const result = await invokeFunction('sendPasswordReset', { email: 'tester@example.com' }, admin);
  assert.equal(result.dry_run, true);
  assert.match(result.message, /nenhum e-mail foi enviado/);
});
