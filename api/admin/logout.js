import { buildClearCookie } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const isSecure =
      process.env.NODE_ENV === 'production' ||
      req.headers['x-forwarded-proto'] === 'https';
    const clearCookieHeader = buildClearCookie(isSecure);

    res.setHeader('Set-Cookie', clearCookieHeader);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Failed to logout.' });
  }
}
