import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const tokenFile = process.env.TELEGRAM_TOKEN_FILE || '/run/ehi-secrets/telegram-bot-token';
const bootstrapMarker = process.env.BOOTSTRAP_MARKER_FILE || '/run/ehi-secrets/.bootstrapped';

export function getTelegramToken() {
  const fromEnvironment = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    return readFileSync(tokenFile, 'utf8').trim();
  } catch {
    return '';
  }
}

export function bootstrapTelegramToken(token) {
  if (existsSync(bootstrapMarker)) throw new Error('already_bootstrapped');
  if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) throw new Error('invalid_token');
  writeFileSync(tokenFile, `${token.trim()}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(bootstrapMarker, `${new Date().toISOString()}\n`, { mode: 0o600, flag: 'wx' });
}

export function canBootstrap() {
  return Boolean(process.env.BOOTSTRAP_SECRET) && !existsSync(bootstrapMarker);
}

export function verifyBootstrapSecret(candidate = '') {
  const expected = process.env.BOOTSTRAP_SECRET || '';
  if (!expected || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export function verifyTelegramLogin(payload) {
  const botToken = getTelegramToken();
  if (!botToken || !payload || typeof payload !== 'object') return null;
  const receivedHash = String(payload.hash || '');
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) return null;

  const fields = Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  const dataCheckString = fields.map(([key, value]) => `${key}=${value}`).join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!timingSafeEqual(Buffer.from(receivedHash, 'hex'), Buffer.from(calculatedHash, 'hex'))) return null;
  const authDate = Number(payload.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 60 || now - authDate > 86_400) return null;

  return {
    id: String(payload.id),
    first_name: String(payload.first_name || '').slice(0, 80),
    last_name: String(payload.last_name || '').slice(0, 80),
    username: String(payload.username || '').slice(0, 64),
    photo_url: String(payload.photo_url || '').slice(0, 500),
  };
}

function sessionSecret() {
  return process.env.SESSION_SECRET || createHash('sha256').update(`ehi:${process.cwd()}`).digest('hex');
}

export function createSession(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 30 * 86_400_000 })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSession(value = '') {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const result = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!result.user || result.exp < Date.now()) return null;
    return result.user;
  } catch {
    return null;
  }
}

export function randomWebhookSecret() {
  return randomBytes(32).toString('hex');
}
