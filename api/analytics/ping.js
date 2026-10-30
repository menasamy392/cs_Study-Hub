import { parseCookies, verifySessionToken, COOKIE_NAME, getRequestBody } from '../_auth.js';
import { supabaseAdmin, isServerSupabaseConfigured } from '../_supabase.js';

// Helper to determine date in Africa/Cairo timezone
export function getCairoDateString(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // e.g. "2026-10-30"
  } catch {
    return date.toISOString().split('T')[0];
  }
}

// Helper to detect device type from User-Agent
export function getDeviceType(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

// In-memory memory fallback store for recent pings (in case DB migration is pending)
// visitorId -> { lastSeen: number, sessionId: string, cairoDate: string }
const recentPings = new Map();
const FIVE_MINUTES_MS = 5 * 60 * 1000;

function pruneRecentPings() {
  const now = Date.now();
  for (const [vId, record] of recentPings.entries()) {
    if (now - record.lastSeen > FIVE_MINUTES_MS) {
      recentPings.delete(vId);
    }
  }
}

export function getInMemoryLiveVisitors() {
  pruneRecentPings();
  return recentPings.size;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 1. Exclude Admin activity from student visitor statistics
    const cookies = parseCookies(req.headers.cookie || '');
    const adminToken = cookies[COOKIE_NAME];
    const adminPayload = verifySessionToken(adminToken);

    if (adminPayload && adminPayload.role === 'admin') {
      return res.status(200).json({ ignored: true, reason: 'admin_session_active' });
    }

    const body = await getRequestBody(req);
    const {
      visitorId,
      sessionId,
      path = '/',
      isNewSession = false,
    } = body || {};

    // Exclude admin paths
    if (path && (path === '/admin' || path.startsWith('/admin/'))) {
      return res.status(200).json({ ignored: true, reason: 'admin_path' });
    }

    if (!visitorId || typeof visitorId !== 'string' || visitorId.length < 8) {
      return res.status(400).json({ error: 'Valid visitorId is required' });
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const deviceType = getDeviceType(userAgent);
    const cairoDate = getCairoDateString();

    // Track in-memory for immediate live visitor count
    recentPings.set(visitorId, {
      lastSeen: Date.now(),
      sessionId,
      cairoDate,
      path: path.slice(0, 100),
    });
    pruneRecentPings();

    // 2. Persist in Supabase Cloud Database if configured
    let cloudSynced = false;
    let cloudError = null;

    if (isServerSupabaseConfigured && supabaseAdmin) {
      try {
        // Try atomic RPC procedure first
        const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('record_analytics_ping', {
          p_visitor_id: visitorId,
          p_session_id: sessionId,
          p_cairo_date: cairoDate,
          p_path: path.slice(0, 120),
          p_user_agent: userAgent.slice(0, 255),
          p_device_type: deviceType,
          p_is_new_session: Boolean(isNewSession),
        });

        if (!rpcErr && rpcRes?.success) {
          cloudSynced = true;
        } else {
          cloudError = rpcErr?.message || 'RPC execution returned unsuccessful';

          // Fallback to direct upserts if RPC is not deployed yet
          try {
            await supabaseAdmin.from('analytics_visitors').upsert({
              visitor_id: visitorId,
              last_seen_at: new Date().toISOString(),
              user_agent: userAgent.slice(0, 255),
              device_type: deviceType,
            }, { onConflict: 'visitor_id' });

            await supabaseAdmin.from('analytics_sessions').upsert({
              session_id: sessionId,
              visitor_id: visitorId,
              cairo_date: cairoDate,
              last_heartbeat_at: new Date().toISOString(),
              last_page: path.slice(0, 120),
            }, { onConflict: 'session_id' });

            cloudSynced = true;
          } catch (directErr) {
            cloudError = directErr.message;
          }
        }
      } catch (err) {
        cloudError = err.message;
      }
    }

    return res.status(200).json({
      success: true,
      cloudSynced,
      cloudError: cloudSynced ? null : cloudError,
      liveVisitorsEstimate: recentPings.size,
      cairoDate,
    });
  } catch (err) {
    console.error('Analytics ping error:', err);
    return res.status(500).json({ error: 'Internal error recording ping' });
  }
}
