import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { config } from './config.mjs';
import { db } from './db.mjs';

export function fillTemplate(template, variables) {
  return String(template || '').replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key) => variables[key] == null ? '' : String(variables[key]));
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]);
}

export function emailDeliveryEnabled() {
  return !config.emailDryRun && Boolean(config.resendApiKey);
}

async function deliver(payload, idempotencyKey) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      if (attempt === 2) throw new Error('Falha de conexão com o Resend. O envio não pôde ser confirmado.');
      await sleep(500 * 2 ** attempt);
      continue;
    }
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      if (!result.id) throw new Error('Resend retornou uma resposta sem identificador de envio.');
      return result;
    }
    const retryAfter = response.headers.get('retry-after');
    const retryDelay = retryAfter == null ? 500 * 2 ** attempt : Number(retryAfter) * 1000;
    if (attempt < 2 && [429, 500, 502, 503, 504].includes(response.status) && Number.isFinite(retryDelay) && retryDelay >= 0 && retryDelay <= 5000) {
      await sleep(retryDelay);
      continue;
    }
    throw new Error(result.message || `Resend retornou HTTP ${response.status}`);
  }
}

export async function sendEmail({ emailType, to, subject, html, attachments = [] }) {
  const recipients = [...new Set((Array.isArray(to) ? to : [to]).filter(Boolean).map(email => String(email).trim().toLowerCase()).filter(Boolean))];
  const logId = randomUUID();
  const createdAt = new Date().toISOString();

  if (recipients.length === 0) throw new Error('No email recipients');

  if (config.emailDryRun) {
    db.prepare('INSERT INTO email_log (id, email_type, recipients, subject, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(logId, emailType, JSON.stringify(recipients), subject, 'dry_run', createdAt);
    return { id: `dry-run-${logId}`, dryRun: true, accepted: false };
  }

  let result;
  try {
    if (!config.resendApiKey) throw new Error('Resend não configurado. Nenhum e-mail foi enviado.');
    result = await deliver({ from: config.emailFrom, to: recipients, subject, html, attachments }, `alliage/${logId}`);
  } catch (error) {
    const message = String(error.message).replace(/re_[A-Za-z0-9_-]+/g, '[redacted]');
    db.prepare('INSERT INTO email_log (id, email_type, recipients, subject, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(logId, emailType, JSON.stringify(recipients), subject, 'error', message, createdAt);
    throw new Error(message);
  }

  db.prepare('INSERT INTO email_log (id, email_type, recipients, subject, status, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(logId, emailType, JSON.stringify(recipients), subject, 'sent', result.id || null, createdAt);
  return { ...result, dryRun: false, accepted: true };
}
