import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const VISITOR_ID_KEY = 'study_hub_visitor_id';
const SESSION_KEY = 'study_hub_analytics_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity starts a new session
const HEARTBEAT_INTERVAL_MS = 35 * 1000; // Ping every 35 seconds to keep live visitor status

// Fast UUID generator with fallback
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Retrieve or create persistent anonymous visitor ID
export function getOrCreateVisitorId() {
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId || visitorId.length < 10) {
      visitorId = 'vid_' + generateUUID();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return 'vid_' + generateUUID();
  }
}

// Retrieve or create active session (de-duplicated across tabs in the same browser)
export function getOrCreateSession() {
  const now = Date.now();
  let isNewSession = false;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId && now - parsed.lastActive < SESSION_TIMEOUT_MS) {
        // Active session is still valid
        parsed.lastActive = now;
        localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return { sessionId: parsed.sessionId, isNewSession: false };
      }
    }
  } catch {}

  // Expired or new session
  const newSessionId = 'sess_' + generateUUID();
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ sessionId: newSessionId, lastActive: now })
    );
  } catch {}

  return { sessionId: newSessionId, isNewSession: true };
}

// Update session timestamp in localStorage
function touchSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.lastActive = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

/**
 * useAnalyticsTracker
 * Lightweight, privacy-respecting client analytics hook.
 * De-duplicates multiple tabs, respects 30-min session timeout,
 * and maintains 5-minute live visitor status with 35s heartbeats.
 */
export function useAnalyticsTracker() {
  const location = useLocation();
  const lastPingTimeRef = useRef(0);
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  const sendPing = async (forcedNewSession = false) => {
    const path = currentPathRef.current;

    // Do NOT track admin dashboard pages or admin logins
    if (path === '/admin' || path.startsWith('/admin/')) {
      return;
    }

    try {
      const visitorId = getOrCreateVisitorId();
      const { sessionId, isNewSession } = getOrCreateSession();

      touchSession();
      lastPingTimeRef.current = Date.now();

      await fetch('/api/analytics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({
          visitorId,
          sessionId,
          path,
          isNewSession: forcedNewSession || isNewSession,
        }),
      });
    } catch {
      // Silently fail without interrupting student experience
    }
  };

  // 1. Initial Page Load & Route Change Tracking
  useEffect(() => {
    // Only track if not in admin
    if (!location.pathname.startsWith('/admin')) {
      sendPing();
    }
  }, [location.pathname]);

  // 2. Periodic Heartbeat Tracking (Every 35s while tab is visible)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendPing(false);
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLast = Date.now() - lastPingTimeRef.current;
        // If more than 30 seconds since last ping, send one immediately
        if (timeSinceLast > 30 * 1000) {
          sendPing(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
