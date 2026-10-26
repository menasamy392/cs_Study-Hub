import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Configuration
export const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'minasami').trim().toLowerCase();

// Default hash corresponds to: Minasami@2026!
// Can be overridden via ADMIN_PASSWORD_HASH or plaintext ADMIN_PASSWORD in environment variables
export const DEFAULT_PASSWORD_HASH = '$2b$10$hXbfIoPiUO21tj9.OXdVtOTNrqScgepOhBlxQRayaL8Lza9eI759i';
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
export const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || null;

// Session signing secret (HMAC SHA-256)
export const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'study-hub-secure-admin-session-salt-2026-minasami-b7e8d9c0a1f2e3d4';

export const COOKIE_NAME = 'admin_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Rate limiting in-memory store
// IP -> { count: number, firstFailedAt: number, blockedUntil: number }
const rateLimitMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

export function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    return { blocked: false };
  }

  // Check if active block exists
  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      blocked: true,
      retryAfter,
      message: `Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
    };
  }

  // Reset if window has elapsed
  if (now - record.firstFailedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.delete(ip);
    return { blocked: false };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + RATE_LIMIT_WINDOW_MS;
    const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
    return {
      blocked: true,
      retryAfter,
      message: `Too many failed attempts. Try again in 15 minutes.`,
    };
  }

  return { blocked: false };
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.firstFailedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, {
      count: 1,
      firstFailedAt: now,
      blockedUntil: 0,
    });
  } else {
    record.count += 1;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.blockedUntil = now + RATE_LIMIT_WINDOW_MS;
    }
  }
}

export function clearRateLimit(ip) {
  rateLimitMap.delete(ip);
}

// Explicit check for deprecated/old credentials
export function isOldCredential(username, password) {
  const u = (username || '').trim().toLowerCase();
  const p = (password || '').trim();
  const oldUsers = ['admin@csstudyhub.edu', 'admin@demo.com', 'admin@studyhub.edu', 'admin'];
  if (oldUsers.includes(u)) return true;
  if (p === 'admin123') return true;
  return false;
}

// Validate credentials against current admin settings
export async function verifyAdminCredentials(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // Reject deprecated credentials
  if (isOldCredential(cleanUser, cleanPass)) {
    return false;
  }

  // Username must match ADMIN_USERNAME
  if (cleanUser !== ADMIN_USERNAME) {
    return false;
  }

  // If a plaintext ADMIN_PASSWORD is set in env, compare with constant-time check
  if (ADMIN_PASSWORD_PLAIN) {
    const a = Buffer.from(cleanPass, 'utf8');
    const b = Buffer.from(ADMIN_PASSWORD_PLAIN, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  // Verify against bcrypt hash
  try {
    const match = await bcrypt.compare(cleanPass, ADMIN_PASSWORD_HASH);
    return match;
  } catch (err) {
    console.error('Password comparison error:', err);
    return false;
  }
}

// Token creation (HMAC-SHA256 signed session)
export function createSessionToken(username) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: username,
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

// Token verification
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [b64Header, b64Payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expSigBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expSigBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expSigBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    if (payload.role !== 'admin') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Cookie Parsing & Header Generation
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [name, ...valParts] = pair.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(valParts.join('='));
    }
  }
  return cookies;
}

export function buildSessionCookie(token, isSecure = false) {
  const flags = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (isSecure) {
    flags.push('Secure');
  }
  return flags.join('; ');
}

export function buildClearCookie(isSecure = false) {
  const flags = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (isSecure) {
    flags.push('Secure');
  }
  return flags.join('; ');
}

// Helper to parse JSON body from incoming request
export async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}
