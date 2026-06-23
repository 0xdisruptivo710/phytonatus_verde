import crypto from 'node:crypto';

export const COOKIE_NAME = 'phyto_cms';
const TTL_MS = 8 * 60 * 60 * 1000;

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

export function verifyPassword(password, hashHex) {
  if (!hashHex) return false;
  const a = Buffer.from(hashPassword(password), 'hex');
  const b = Buffer.from(String(hashHex), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signSession(secret, now = Date.now(), ttl = TTL_MS) {
  const exp = String(now + ttl);
  const sig = crypto.createHmac('sha256', secret).update(exp).digest('hex');
  return `${exp}.${sig}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(exp).digest('hex');
  // Compara as strings hex como bytes UTF-8 (não decodifica hex — assim lixo
  // não-hex no fim não é silenciosamente ignorado). Checa comprimento antes
  // do timingSafeEqual (que exige buffers do mesmo tamanho).
  if (sig.length !== expected.length) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (!crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > now;
}

export function buildSessionCookie(token, maxAgeSec = 8 * 60 * 60) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function readCookie(cookieHeader, name = COOKIE_NAME) {
  if (!cookieHeader) return null;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return part.slice(idx + 1).trim();
  }
  return null;
}
