import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { bootstrapTelegramToken, canBootstrap, createSession, readSession, verifyBootstrapSecret, verifyTelegramLogin } from './secrets.mjs';
import { configureTelegramBot, getBotProfile, handleTelegramUpdate } from './telegram.mjs';

const port = Number(process.env.PORT || 3015);
const host = process.env.HOST || '127.0.0.1';
const publicOrigin = process.env.PUBLIC_ORIGIN || 'http://localhost:3015';
const staticRoot = resolve(process.env.STATIC_ROOT || 'dist');
const indexFile = join(staticRoot, 'index.html');
const sessionCookie = 'ehi_session';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

function securityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src https://oauth.telegram.org https://telegram.org https://t.me; connect-src 'self'; base-uri 'self'; form-action 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

function json(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, { ...securityHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  response.end(JSON.stringify(payload));
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
}

async function readJson(request, limit = 32_768) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function serveFile(request, response, filePath) {
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    ...securityHeaders(),
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Content-Length': statSync(filePath).size,
    'Cache-Control': filePath.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (request.method === 'HEAD') return response.end();
  return createReadStream(filePath).pipe(response);
}

async function routeApi(request, response, url) {
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json(response, 200, { ok: true, service: 'ehi-cinema' });
  }

  if (url.pathname === '/api/config' && request.method === 'GET') {
    try {
      const bot = await getBotProfile();
      return json(response, 200, { botUsername: bot.username });
    } catch {
      return json(response, 503, { error: 'telegram_not_configured' });
    }
  }

  if (url.pathname === '/api/admin/bootstrap' && request.method === 'POST') {
    if (!canBootstrap() || !verifyBootstrapSecret(request.headers['x-bootstrap-secret'])) return json(response, 404, { error: 'not_found' });
    try {
      const { token } = await readJson(request);
      bootstrapTelegramToken(String(token || ''));
      await configureTelegramBot();
      return json(response, 201, { ok: true });
    } catch (error) {
      return json(response, 400, { error: error.message === 'invalid_token' ? 'invalid_token' : 'bootstrap_failed' });
    }
  }

  if (url.pathname === '/api/auth/telegram' && request.method === 'POST') {
    try {
      const user = verifyTelegramLogin(await readJson(request));
      if (!user) return json(response, 401, { error: 'invalid_telegram_signature' });
      const token = createSession(user);
      return json(response, 200, { user }, { 'Set-Cookie': `${sessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` });
    } catch {
      return json(response, 400, { error: 'invalid_request' });
    }
  }

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = readSession(parseCookies(request.headers.cookie)[sessionCookie]);
    return user ? json(response, 200, { user }) : json(response, 401, { error: 'unauthorized' });
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    return json(response, 200, { ok: true }, { 'Set-Cookie': `${sessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }

  if (url.pathname === '/api/telegram/webhook' && request.method === 'POST') {
    if (request.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) return json(response, 401, { error: 'unauthorized' });
    try {
      const update = await readJson(request, 128_000);
      json(response, 200, { ok: true });
      handleTelegramUpdate(update).catch((error) => console.error('Telegram update failed:', error.message));
      return;
    } catch {
      return json(response, 400, { error: 'invalid_update' });
    }
  }

  return json(response, 404, { error: 'not_found' });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, publicOrigin);
    if (url.pathname.startsWith('/api/')) return await routeApi(request, response, url);
    if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'method_not_allowed' });

    const relative = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    const candidate = resolve(staticRoot, relative || 'index.html');
    if (candidate.startsWith(staticRoot) && existsSync(candidate) && statSync(candidate).isFile()) return serveFile(request, response, candidate);
    if (existsSync(indexFile)) return serveFile(request, response, indexFile);
    return json(response, 503, { error: 'frontend_not_built' });
  } catch (error) {
    console.error('Request failed:', error.message);
    return json(response, 500, { error: 'internal_error' });
  }
});

server.listen(port, host, () => {
  console.log(`EHI! CINEMA listening on ${host}:${port}`);
  configureTelegramBot().catch(() => console.log('Telegram bot is waiting for secure bootstrap.'));
});
