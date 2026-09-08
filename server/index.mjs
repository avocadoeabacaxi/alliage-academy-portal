import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config.mjs';
import {
  consumeAuthCode,
  consumeAuthCodeByHash,
  consumeOauthState,
  countRecords,
  createRecord,
  deleteRecord,
  getAccountByEmail,
  getAccountById,
  getEmailStats,
  getRecord,
  listRecords,
  saveAuthCode,
  saveOauthState,
  setAccountPassword,
  setAccountVerified,
  updateRecord,
  upsertAccount,
} from './db.mjs';
import { invokeFunction, runRecordAutomation, sendAccessEmail } from './functions.mjs';
import { escapeHtml, sendEmail } from './mailer.mjs';
import { hashOneTimeValue, hashPassword, randomOtp, randomToken, signAccessToken, verifyAccessToken, verifyPassword } from './security.mjs';
import { startScheduler } from './scheduler.mjs';

const distDir = resolve(config.rootDir, 'dist');
const publicFunctionNames = new Set(['requestAccess', 'getSurveyByToken', 'createSurveyResponse']);
const preApprovalFunctionNames = new Set(['checkUserAuthorization', 'ensureUserAuthorization']);
const allowedEntities = new Set(['TrainingRequest', 'UserAuthorization', 'RoutingRule', 'SatisfactionSurvey', 'TrainingEvaluation', 'EmailTemplate', 'SurveyResponse', 'User']);
const managementRoles = new Set(['admin', 'gerente_regional', 'educador']);
const adminEntities = new Set(['EmailTemplate', 'RoutingRule', 'UserAuthorization']);
const managementEntities = new Set(['User', 'TrainingEvaluation', 'SurveyResponse', 'SatisfactionSurvey']);
const rateLimits = new Map();
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function enforceRateLimit(request, bucket, limit, windowMs) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || request.socket.remoteAddress || 'unknown';
  const key = `${bucket}:${address}`;
  const now = Date.now();
  let entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + windowMs };
  entry.count += 1;
  rateLimits.set(key, entry);
  if (entry.count > limit) throw new HttpError(429, 'Muitas tentativas. Aguarde e tente novamente.');
  if (rateLimits.size > 10_000) {
    for (const [storedKey, stored] of rateLimits) if (stored.resetAt <= now) rateLimits.delete(storedKey);
  }
}

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

function sendJson(response, status, body) {
  securityHeaders(response);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request, maxBytes = config.maxUploadBytes + 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new HttpError(413, 'Payload muito grande');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON inválido');
  }
}

function bearerToken(request) {
  const authorization = request.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

function findUserRecord(account) {
  if (!account) return null;
  return getRecord('User', account.id) || listRecords('User', { filters: { email: account.email }, limit: 1 })[0] || null;
}

function mergedUser(account) {
  if (!account) return null;
  const record = findUserRecord(account) || { id: account.id, email: account.email, full_name: '' };
  const authorization = listRecords('UserAuthorization', { filters: { email: account.email.toLowerCase() }, limit: 1 })[0];
  const role = authorization?.role || record.role || 'solicitante';
  return {
    ...record,
    id: record.id || account.id,
    email: account.email,
    role,
    region: authorization?.region || record.region || '',
    authorization_status: authorization?.status || 'pending',
    email_verified: Boolean(account.email_verified),
  };
}

function currentUser(request, required = true) {
  const payload = verifyAccessToken(bearerToken(request));
  const account = payload ? getAccountById(payload.sub) : null;
  const user = mergedUser(account);
  if (!user && required) throw new HttpError(401, 'Autenticação necessária');
  return user;
}

function requireApproved(user) {
  if (!user) throw new HttpError(401, 'Autenticação necessária');
  if (user.authorization_status !== 'approved') throw new HttpError(403, 'Acesso ainda não aprovado');
}

function requireAdmin(user) {
  requireApproved(user);
  if (user.role !== 'admin') throw new HttpError(403, 'Apenas administradores');
}

function requireManagement(user) {
  requireApproved(user);
  if (!managementRoles.has(user.role)) throw new HttpError(403, 'Permissão insuficiente');
}

function entityAccess(user, entity, action, record = null) {
  requireApproved(user);
  if (adminEntities.has(entity)) return requireAdmin(user);
  if (managementEntities.has(entity)) return requireManagement(user);
  if (entity === 'TrainingRequest' && ['update', 'delete'].includes(action) && record) {
    const owner = record.created_by_id === user.id || record.created_by === user.email || record.requester_email === user.email;
    if (!owner && !managementRoles.has(user.role)) throw new HttpError(403, 'Você não pode alterar esta solicitação');
  }
  if (entity === 'TrainingRequest' && action === 'read' && record && !managementRoles.has(user.role)) {
    const owner = record.created_by_id === user.id || record.created_by === user.email || record.requester_email === user.email;
    if (!owner) throw new HttpError(403, 'Você não pode acessar esta solicitação');
  }
}

function createSession(account) {
  return { access_token: signAccessToken(account), user: mergedUser(account) };
}

function emailHtml(title, content) {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto"><h2 style="color:#003B5C">${escapeHtml(title)}</h2>${content}</div>`;
}

async function sendVerificationCode(email) {
  const otp = randomOtp();
  saveAuthCode({ email, codeHash: hashOneTimeValue(otp), purpose: 'verify_email', expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
  await sendEmail({
    emailType: 'verify_email',
    to: email,
    subject: 'Seu código de verificação — Alliage Trainning',
    html: emailHtml('Verifique seu e-mail', `<p>Use o código abaixo para concluir seu cadastro:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold">${otp}</p><p>O código expira em 15 minutos.</p>`),
  });
}

function validRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function oauthConfig(provider) {
  if (provider === 'google') return {
    clientId: config.googleClientId,
    clientSecret: config.googleClientSecret,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
  };
  if (provider === 'microsoft') return {
    clientId: config.microsoftClientId,
    clientSecret: config.microsoftClientSecret,
    authorizeUrl: `https://login.microsoftonline.com/${config.microsoftTenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${config.microsoftTenant}/oauth2/v2.0/token`,
    scope: 'openid email profile User.Read',
  };
  throw new HttpError(404, 'Provedor OAuth desconhecido');
}

async function oauthStart(response, provider, url) {
  const settings = oauthConfig(provider);
  if (!settings.clientId || !settings.clientSecret) throw new HttpError(503, `Login ${provider} ainda não configurado`);
  const state = randomToken(24);
  const redirectTo = validRedirect(url.searchParams.get('redirect'));
  saveOauthState({ state, provider, redirectTo, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
  const callback = `${config.appOrigin}/api/auth/oauth/${provider}/callback`;
  const authorize = new URL(settings.authorizeUrl);
  authorize.searchParams.set('client_id', settings.clientId);
  authorize.searchParams.set('redirect_uri', callback);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', settings.scope);
  authorize.searchParams.set('state', state);
  if (provider === 'google') authorize.searchParams.set('access_type', 'online');
  securityHeaders(response);
  response.writeHead(302, { Location: authorize.toString(), 'Cache-Control': 'no-store' });
  response.end();
}

async function oauthCallback(response, provider, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const saved = state ? consumeOauthState(state, provider) : null;
  if (!code || !saved) throw new HttpError(400, 'Retorno OAuth inválido ou expirado');
  const settings = oauthConfig(provider);
  const callback = `${config.appOrigin}/api/auth/oauth/${provider}/callback`;
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    code,
    redirect_uri: callback,
    grant_type: 'authorization_code',
  });
  const tokenResponse = await fetch(settings.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) throw new HttpError(401, tokens.error_description || 'Falha ao autenticar no provedor');

  const profileResponse = await fetch(provider === 'google' ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok) throw new HttpError(401, 'Não foi possível obter o perfil social');
  const email = String(profile.email || profile.mail || profile.userPrincipalName || '').toLowerCase();
  if (!email) throw new HttpError(400, 'O provedor não retornou um e-mail');
  const account = upsertAccount({ email, emailVerified: true, googleId: provider === 'google' ? profile.sub : null, microsoftId: provider === 'microsoft' ? profile.id : null });
  let user = findUserRecord(account);
  if (!user) user = createRecord('User', { id: account.id, email, full_name: profile.name || profile.displayName || '', role: 'user' });
  const session = createSession(account);
  const target = new URL(saved.redirect_to, config.appOrigin);
  target.searchParams.set('access_token', session.access_token);
  securityHeaders(response);
  response.writeHead(302, { Location: target.toString(), 'Cache-Control': 'no-store' });
  response.end();
}

async function handleAuth(request, response, pathname, url) {
  if (request.method === 'GET' && /^\/api\/auth\/oauth\/(google|microsoft)$/.test(pathname)) {
    return oauthStart(response, pathname.split('/').at(-1), url);
  }
  const callbackMatch = pathname.match(/^\/api\/auth\/oauth\/(google|microsoft)\/callback$/);
  if (request.method === 'GET' && callbackMatch) return oauthCallback(response, callbackMatch[1], url);

  if (request.method === 'GET' && pathname === '/api/auth/me') return sendJson(response, 200, currentUser(request));
  if (request.method === 'PATCH' && pathname === '/api/auth/me') {
    const user = currentUser(request);
    const payload = await readJson(request);
    const allowed = { full_name: payload.full_name, photo_url: payload.photo_url };
    const cleaned = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
    const updated = updateRecord('User', user.id, cleaned);
    if (!updated) throw new HttpError(404, 'Usuário não encontrado');
    return sendJson(response, 200, mergedUser(getAccountByEmail(user.email)));
  }

  const payload = await readJson(request);
  if (request.method === 'POST' && pathname === '/api/auth/login') {
    enforceRateLimit(request, 'login', 20, 15 * 60 * 1000);
    const email = String(payload.email || '').trim().toLowerCase();
    const account = getAccountByEmail(email);
    if (!account || !account.password_hash || !verifyPassword(String(payload.password || ''), account.password_salt, account.password_hash)) {
      throw new HttpError(401, 'E-mail ou senha inválidos');
    }
    if (!account.email_verified) throw new HttpError(403, 'Confirme seu e-mail antes de entrar');
    return sendJson(response, 200, createSession(account));
  }
  if (request.method === 'POST' && pathname === '/api/auth/register') {
    enforceRateLimit(request, 'register', 5, 60 * 60 * 1000);
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'E-mail inválido');
    if (password.length < 6) throw new HttpError(400, 'A senha deve ter pelo menos 6 caracteres');
    const authorization = listRecords('UserAuthorization', { filters: { email }, limit: 1 })[0];
    if (!authorization) throw new HttpError(403, 'Solicite acesso antes de criar a conta');
    if (authorization.status === 'rejected') throw new HttpError(403, 'Sua solicitação de acesso foi rejeitada');
    const existing = getAccountByEmail(email);
    if (existing?.password_hash) throw new HttpError(409, 'Já existe uma conta cadastrada com este e-mail');
    const passwordData = hashPassword(password);
    const account = existing
      ? setAccountPassword(email, passwordData.hash, passwordData.salt)
      : upsertAccount({ email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt });
    if (!findUserRecord(account)) createRecord('User', { id: account.id, email, full_name: authorization.full_name || '', role: authorization.role === 'admin' ? 'admin' : 'user', region: authorization.region || '' });
    await sendVerificationCode(email);
    return sendJson(response, 200, { success: true });
  }
  if (request.method === 'POST' && pathname === '/api/auth/verify-otp') {
    enforceRateLimit(request, 'verify-otp', 10, 15 * 60 * 1000);
    const email = String(payload.email || '').trim().toLowerCase();
    const valid = consumeAuthCode({ email, codeHash: hashOneTimeValue(String(payload.otpCode || '')), purpose: 'verify_email' });
    if (!valid) throw new HttpError(400, 'Código inválido ou expirado');
    setAccountVerified(email, true);
    const account = getAccountByEmail(email);
    if (!account) throw new HttpError(404, 'Conta não encontrada');
    return sendJson(response, 200, createSession(account));
  }
  if (request.method === 'POST' && pathname === '/api/auth/resend-otp') {
    enforceRateLimit(request, 'resend-otp', 5, 60 * 60 * 1000);
    const email = String(payload.email || '').trim().toLowerCase();
    if (getAccountByEmail(email)) await sendVerificationCode(email);
    return sendJson(response, 200, { success: true });
  }
  if (request.method === 'POST' && pathname === '/api/auth/password-reset/request') {
    enforceRateLimit(request, 'password-reset-request', 5, 60 * 60 * 1000);
    const email = String(payload.email || '').trim().toLowerCase();
    const account = getAccountByEmail(email);
    if (account) {
      const token = randomToken(32);
      saveAuthCode({ email, codeHash: hashOneTimeValue(token), purpose: 'password_reset', expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
      const link = `${config.appOrigin}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({ emailType: 'password_reset', to: email, subject: 'Redefinição de senha — Alliage Trainning', html: emailHtml('Redefina sua senha', `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${link}">Criar uma nova senha</a></p><p>O link expira em uma hora.</p>`) });
    }
    return sendJson(response, 200, { success: true });
  }
  if (request.method === 'POST' && pathname === '/api/auth/password-reset') {
    const password = String(payload.newPassword || '');
    if (password.length < 6) throw new HttpError(400, 'A senha deve ter pelo menos 6 caracteres');
    const code = consumeAuthCodeByHash({ codeHash: hashOneTimeValue(String(payload.resetToken || '')), purpose: 'password_reset' });
    if (!code) throw new HttpError(400, 'Link inválido ou expirado');
    const passwordData = hashPassword(password);
    setAccountPassword(code.email, passwordData.hash, passwordData.salt);
    setAccountVerified(code.email, true);
    return sendJson(response, 200, { success: true });
  }
  throw new HttpError(404, 'Rota de autenticação não encontrada');
}

async function handleEntity(request, response, pathname, url) {
  const match = pathname.match(/^\/api\/entities\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) throw new HttpError(404, 'Entidade não encontrada');
  const entity = decodeURIComponent(match[1]);
  const id = match[2] ? decodeURIComponent(match[2]) : null;
  if (!allowedEntities.has(entity)) throw new HttpError(404, 'Entidade não encontrada');
  const user = currentUser(request);
  const existing = id ? getRecord(entity, id) : null;
  const action = request.method === 'GET' ? 'read' : request.method === 'POST' ? 'create' : request.method === 'PATCH' ? 'update' : 'delete';
  entityAccess(user, entity, action, existing);

  if (request.method === 'GET' && id) {
    if (!existing) throw new HttpError(404, 'Registro não encontrado');
    return sendJson(response, 200, existing);
  }
  if (request.method === 'GET') {
    let filters = {};
    try { filters = JSON.parse(url.searchParams.get('filter') || '{}'); } catch { throw new HttpError(400, 'Filtro inválido'); }
    let records = listRecords(entity, {
      filters,
      sort: url.searchParams.get('sort') || '',
      limit: Number(url.searchParams.get('limit') || 500),
      skip: Number(url.searchParams.get('skip') || 0),
    });
    if (entity === 'TrainingRequest' && !managementRoles.has(user.role)) {
      records = records.filter(record => record.created_by_id === user.id || record.created_by === user.email || record.requester_email === user.email);
    }
    if (entity === 'User') records = records.map(record => mergedUser(getAccountByEmail(record.email)) || record);
    return sendJson(response, 200, records);
  }
  if (request.method === 'POST' && !id) {
    let payload = await readJson(request);
    if (entity === 'TrainingRequest' && !managementRoles.has(user.role)) {
      payload = { ...payload, requester_email: user.email, requester_name: user.full_name || payload.requester_name || '' };
    }
    const created = createRecord(entity, payload, user);
    void runRecordAutomation(entity, null, created);
    return sendJson(response, 201, created);
  }
  if (request.method === 'PATCH' && id) {
    if (!existing) throw new HttpError(404, 'Registro não encontrado');
    const payload = await readJson(request);
    if (entity === 'TrainingRequest' && !managementRoles.has(user.role)) {
      const keys = Object.keys(payload);
      if (keys.length !== 1 || keys[0] !== 'status' || payload.status !== 'Cancelado') {
        throw new HttpError(403, 'Solicitantes só podem cancelar suas próprias solicitações');
      }
    }
    const updated = updateRecord(entity, id, payload);
    if (entity === 'User' && payload.role) {
      const authorization = listRecords('UserAuthorization', { filters: { email: updated.email }, limit: 1 })[0];
      if (authorization) updateRecord('UserAuthorization', authorization.id, { role: payload.role === 'user' ? 'solicitante' : payload.role, region: payload.region ?? authorization.region });
    }
    void runRecordAutomation(entity, existing, updated);
    return sendJson(response, 200, updated);
  }
  if (request.method === 'DELETE' && id) {
    if (!existing || !deleteRecord(entity, id)) throw new HttpError(404, 'Registro não encontrado');
    return sendJson(response, 200, { success: true });
  }
  throw new HttpError(405, 'Método não permitido');
}

async function handleFunction(request, response, pathname) {
  if (request.method !== 'POST') throw new HttpError(405, 'Método não permitido');
  const name = decodeURIComponent(pathname.slice('/api/functions/'.length));
  if (name === 'requestAccess') enforceRateLimit(request, 'request-access', 5, 60 * 60 * 1000);
  if (name === 'createSurveyResponse') enforceRateLimit(request, 'survey-response', 20, 60 * 60 * 1000);
  const user = publicFunctionNames.has(name) ? currentUser(request, false) : currentUser(request);
  if (!publicFunctionNames.has(name) && !preApprovalFunctionNames.has(name)) requireApproved(user);
  const payload = await readJson(request);
  const result = await invokeFunction(name, payload, user);
  return sendJson(response, 200, { data: result });
}

async function handleInvite(request, response) {
  requireAdmin(currentUser(request));
  const payload = await readJson(request);
  const email = String(payload.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'E-mail inválido');
  const authorization = listRecords('UserAuthorization', { filters: { email }, limit: 1 })[0];
  if (!authorization || authorization.status !== 'approved') throw new HttpError(400, 'Autorize o usuário antes de enviar o convite');
  await sendAccessEmail(email, authorization.full_name || '');
  return sendJson(response, 200, { success: true });
}

async function handleUpload(request, response) {
  const user = currentUser(request);
  requireApproved(user);
  const payload = await readJson(request);
  const match = String(payload.data || '').match(/^data:([^;]+);base64,(.+)$/s);
  const type = String(payload.type || match?.[1] || '');
  const allowedTypes = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['application/pdf', '.pdf']]);
  if (!allowedTypes.has(type)) throw new HttpError(400, 'Tipo de arquivo não permitido');
  const data = Buffer.from(match?.[2] || payload.data || '', 'base64');
  if (!data.length || data.length > config.maxUploadBytes) throw new HttpError(413, 'Arquivo vazio ou muito grande');
  const filename = `${randomUUID()}${allowedTypes.get(type)}`;
  writeFileSync(join(config.uploadsDir, filename), data, { flag: 'wx', mode: 0o640 });
  return sendJson(response, 201, { file_url: `/uploads/${filename}` });
}

function serveFile(response, file, cacheControl = 'public, max-age=3600') {
  if (!existsSync(file) || !statSync(file).isFile()) return false;
  securityHeaders(response);
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': cacheControl });
  createReadStream(file).pipe(response);
  return true;
}

function serveStatic(response, pathname) {
  if (pathname.startsWith('/uploads/')) {
    const filename = pathname.slice('/uploads/'.length);
    if (!/^[a-f0-9-]+\.(jpg|png|webp|pdf)$/i.test(filename)) throw new HttpError(404, 'Arquivo não encontrado');
    if (serveFile(response, join(config.uploadsDir, filename), 'private, max-age=3600')) return true;
    throw new HttpError(404, 'Arquivo não encontrado');
  }
  if (!existsSync(distDir)) return false;
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  const candidate = resolve(distDir, relative || 'index.html');
  if (candidate.startsWith(`${distDir}/`) && serveFile(response, candidate, relative.includes('.') ? 'public, max-age=31536000, immutable' : 'no-cache')) return true;
  return serveFile(response, join(distDir, 'index.html'), 'no-cache');
}

export const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      securityHeaders(response);
      response.writeHead(204, { Allow: 'GET,POST,PATCH,DELETE,OPTIONS' });
      return response.end();
    }
    const url = new URL(request.url, config.appOrigin);
    const pathname = url.pathname;
    if (pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, 200, {
        status: 'ok',
        application: 'Alliage Trainning',
        records: countRecords(),
        email: { mode: config.emailDryRun || !config.resendApiKey ? 'dry_run' : 'resend', configured: Boolean(config.resendApiKey), log: getEmailStats() },
        ai: { configured: Boolean(config.aiApiUrl && config.aiApiKey && config.aiModel), model: config.aiModel || null },
        oauth: { google: Boolean(config.googleClientId && config.googleClientSecret), microsoft: Boolean(config.microsoftClientId && config.microsoftClientSecret) },
      });
    }
    if (pathname.startsWith('/api/auth/')) return await handleAuth(request, response, pathname, url);
    if (pathname.startsWith('/api/entities/')) return await handleEntity(request, response, pathname, url);
    if (pathname.startsWith('/api/functions/')) return await handleFunction(request, response, pathname);
    if (pathname === '/api/users/invite' && request.method === 'POST') return await handleInvite(request, response);
    if (pathname === '/api/uploads' && request.method === 'POST') return await handleUpload(request, response);
    if (serveStatic(response, pathname)) return;
    return sendJson(response, 404, { message: 'Rota não encontrada' });
  } catch (error) {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error);
    if (!response.headersSent) return sendJson(response, status, { message: status >= 500 && config.nodeEnv === 'production' ? 'Erro interno do servidor' : error.message });
    response.destroy();
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`Alliage Trainning listening on ${config.appOrigin} (port ${config.port})`);
    startScheduler();
  });
}
