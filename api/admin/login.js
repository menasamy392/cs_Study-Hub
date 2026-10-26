import {
  ADMIN_USERNAME,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  verifyAdminCredentials,
  createSessionToken,
  buildSessionCookie,
  getClientIp,
  getRequestBody,
} from '../_auth.js';

export default async function handler(req, res) {
  // CORS / Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const clientIp = getClientIp(req);

  // 1. Check Rate Limiter
  const rateLimit = checkRateLimit(clientIp);
  if (rateLimit.blocked) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({
      error: rateLimit.message || 'Too many failed login attempts. Please try again later.',
    });
  }

  try {
    const body = await getRequestBody(req);
    const { username, password } = body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // 2. Verify Credentials
    const isValid = await verifyAdminCredentials(username, password);
    if (!isValid) {
      recordFailedAttempt(clientIp);
      const updatedLimit = checkRateLimit(clientIp);
      const warning = updatedLimit.blocked
        ? ' Too many failed attempts. Account temporarily locked.'
        : '';
      return res.status(401).json({
        error: `Invalid admin credentials.${warning}`,
      });
    }

    // 3. Clear rate limit on successful authentication
    clearRateLimit(clientIp);

    // 4. Generate signed session token
    const token = createSessionToken(ADMIN_USERNAME);

    // 5. Build HttpOnly Cookie
    const isSecure =
      process.env.NODE_ENV === 'production' ||
      req.headers['x-forwarded-proto'] === 'https';
    const cookieHeader = buildSessionCookie(token, isSecure);

    res.setHeader('Set-Cookie', cookieHeader);
    return res.status(200).json({
      success: true,
      user: {
        username: ADMIN_USERNAME,
        role: 'admin',
        name: 'Study Hub Administrator',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}
