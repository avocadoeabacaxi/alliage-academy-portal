import { randomUUID } from 'node:crypto';
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

export async function sendEmail({ emailType, to, subject, html, attachments = [] }) {
  const recipients = [...new Set((Array.isArray(to) ? to : [to]).filter(Boolean).map(email => email.toLowerCase()))];
  const logId = randomUUID();
  const createdAt = new Date().toISOString();

  if (recipients.length === 0) throw new Error('No email recipients');

  if (config.emailDryRun || !config.resendApiKey) {
    db.prepare('INSERT INTO email_log (id, email_type, recipients, subject, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(logId, emailType, JSON.stringify(recipients), subject, 'dry_run', createdAt);
    return { id: `dry-run-${logId}`, dryRun: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: config.emailFrom, to: recipients, subject, html, attachments }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = result.message || `Resend returned ${response.status}`;
    db.prepare('INSERT INTO email_log (id, email_type, recipients, subject, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(logId, emailType, JSON.stringify(recipients), subject, 'error', message, createdAt);
    throw new Error(message);
  }

  db.prepare('INSERT INTO email_log (id, email_type, recipients, subject, status, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(logId, emailType, JSON.stringify(recipients), subject, 'sent', result.id || null, createdAt);
  return result;
}

