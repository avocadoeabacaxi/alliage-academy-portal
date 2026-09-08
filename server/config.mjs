import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');

function booleanEnv(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const config = {
  rootDir,
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  appOrigin: (process.env.APP_ORIGIN || 'http://localhost:3001').replace(/\/$/, ''),
  dataDir: resolve(process.env.DATA_DIR || resolve(rootDir, '.data')),
  uploadsDir: resolve(process.env.UPLOADS_DIR || resolve(rootDir, '.data', 'uploads')),
  jwtSecret: process.env.JWT_SECRET || 'local-development-secret-change-before-production',
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 24 * 7),
  emailFrom: process.env.EMAIL_FROM || 'Alliage Trainning <no-reply@trainning.alliage.global>',
  emailDryRun: booleanEnv('EMAIL_DRY_RUN', true),
  resendApiKey: process.env.RESEND_API_KEY || '',
  aiApiUrl: (process.env.AI_API_URL || '').replace(/\/$/, ''),
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  microsoftTenant: process.env.MICROSOFT_TENANT || 'common',
  schedulerEnabled: booleanEnv('SCHEDULER_ENABLED', true),
  schedulerTimezone: process.env.SCHEDULER_TIMEZONE || 'America/Sao_Paulo',
  schedulerHour: Number(process.env.SCHEDULER_HOUR || 8),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
};

if (config.nodeEnv === 'production' && config.jwtSecret === 'local-development-secret-change-before-production') {
  throw new Error('JWT_SECRET must be configured in production');
}

mkdirSync(config.dataDir, { recursive: true });
mkdirSync(config.uploadsDir, { recursive: true });

