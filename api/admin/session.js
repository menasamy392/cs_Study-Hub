import {
  COOKIE_NAME,
  parseCookies,
  verifySessionToken,
} from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[COOKIE_NAME];

    if (!token) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(200).json({ authenticated: false, user: null });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        username: payload.sub,
        role: payload.role,
        name: 'Study Hub Administrator',
      },
    });
  } catch (err) {
    console.error('Session verification error:', err);
    return res.status(500).json({ error: 'Failed to verify session.' });
  }
}
