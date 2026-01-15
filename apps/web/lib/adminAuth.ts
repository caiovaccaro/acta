import crypto from 'crypto';

export const ADMIN_SESSION_COOKIE = 'acta_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getAdminCredentials() {
  return {
    email: getEnv('ADMIN_EMAIL'),
    password: getEnv('ADMIN_PASSWORD'),
    secret: getEnv('ADMIN_SESSION_SECRET'),
  };
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const paddedInput = padded + '='.repeat(padLength);
  return Buffer.from(paddedInput, 'base64').toString('utf-8');
}

export function createSessionToken(email: string): string {
  const { secret } = getAdminCredentials();
  const payload = {
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest();
  const signatureB64 = base64UrlEncode(signature);
  return `${payloadB64}.${signatureB64}`;
}

export function verifySessionToken(token?: string | null): { email: string } | null {
  if (!token) return null;
  const { secret } = getAdminCredentials();
  const [payloadB64, signatureB64] = token.split('.');
  if (!payloadB64 || !signatureB64) return null;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest();
  const expectedSignatureB64 = base64UrlEncode(expectedSignature);
  if (expectedSignatureB64 !== signatureB64) return null;

  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    if (!payload?.email || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

