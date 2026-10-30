import { parseCookies, verifySessionToken, COOKIE_NAME } from '../_auth.js';
import { supabaseAdmin, isServerSupabaseConfigured } from '../_supabase.js';
import { getCairoDateString, getInMemoryLiveVisitors } from '../analytics/ping.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // 1. Authenticate Admin Session
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  const payload = verifySessionToken(token);

  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({
      error: 'Unauthorized: Admin authentication required to view website analytics.',
    });
  }

  const cairoDate = getCairoDateString();
  const inMemoryLive = getInMemoryLiveVisitors();

  // 2. Fetch from Supabase
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return res.status(200).json({
      success: true,
      requiresMigration: false,
      isConfigured: false,
      cairoDate,
      liveVisitors: inMemoryLive,
      totalUniqueVisitors: 0,
      totalVisits: 0,
      todayVisitors: inMemoryLive > 0 ? 1 : 0,
      todayVisits: inMemoryLive > 0 ? 1 : 0,
      chart7d: generateEmptySeries(cairoDate, 7),
      chart30d: generateEmptySeries(cairoDate, 30),
      topPages: [],
      deviceBreakdown: [],
    });
  }

  try {
    // Attempt get_analytics_summary RPC
    const { data: summary, error: rpcErr } = await supabaseAdmin.rpc('get_analytics_summary', {
      p_cairo_date: cairoDate,
    });

    if (!rpcErr && summary && summary.success) {
      const liveCount = Math.max(summary.liveVisitors || 0, inMemoryLive);
      return res.status(200).json({
        success: true,
        requiresMigration: false,
        isConfigured: true,
        cairoDate,
        liveVisitors: liveCount,
        totalUniqueVisitors: summary.totalUniqueVisitors || 0,
        totalVisits: summary.totalVisits || 0,
        todayVisitors: summary.todayVisitors || 0,
        todayVisits: summary.todayVisits || 0,
        chart7d: summary.chart7d && summary.chart7d.length > 0 ? summary.chart7d : generateEmptySeries(cairoDate, 7),
        chart30d: summary.chart30d && summary.chart30d.length > 0 ? summary.chart30d : generateEmptySeries(cairoDate, 30),
        topPages: summary.topPages || [],
        deviceBreakdown: summary.deviceBreakdown || [],
      });
    }

    // If RPC failed due to missing function or table
    const isMissingProcedureOrTable =
      rpcErr?.code === 'PGRST202' ||
      rpcErr?.code === 'PGRST205' ||
      rpcErr?.message?.includes('schema cache') ||
      rpcErr?.message?.includes('get_analytics_summary');

    // Attempt direct table fallback
    try {
      const { count: visitorCount } = await supabaseAdmin
        .from('analytics_visitors')
        .select('*', { count: 'exact', head: true });

      const { count: sessionCount } = await supabaseAdmin
        .from('analytics_sessions')
        .select('*', { count: 'exact', head: true });

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: activeSessions } = await supabaseAdmin
        .from('analytics_sessions')
        .select('visitor_id')
        .gte('last_heartbeat_at', fiveMinutesAgo);

      const uniqueActiveSet = new Set((activeSessions || []).map((s) => s.visitor_id));
      const liveCount = Math.max(uniqueActiveSet.size, inMemoryLive);

      const { data: todaySessions } = await supabaseAdmin
        .from('analytics_sessions')
        .select('visitor_id')
        .eq('cairo_date', cairoDate);

      const todayUniqueSet = new Set((todaySessions || []).map((s) => s.visitor_id));

      return res.status(200).json({
        success: true,
        requiresMigration: isMissingProcedureOrTable,
        isConfigured: true,
        cairoDate,
        liveVisitors: liveCount,
        totalUniqueVisitors: visitorCount || 0,
        totalVisits: sessionCount || 0,
        todayVisitors: todayUniqueSet.size || 0,
        todayVisits: todaySessions?.length || 0,
        chart7d: generateEmptySeries(cairoDate, 7),
        chart30d: generateEmptySeries(cairoDate, 30),
        topPages: [],
        deviceBreakdown: [],
        rpcError: rpcErr?.message,
      });
    } catch {
      // Tables don't exist yet in Supabase
      return res.status(200).json({
        success: true,
        requiresMigration: true,
        isConfigured: true,
        cairoDate,
        liveVisitors: inMemoryLive,
        totalUniqueVisitors: inMemoryLive > 0 ? 1 : 0,
        totalVisits: inMemoryLive > 0 ? 1 : 0,
        todayVisitors: inMemoryLive > 0 ? 1 : 0,
        todayVisits: inMemoryLive > 0 ? 1 : 0,
        chart7d: generateEmptySeries(cairoDate, 7),
        chart30d: generateEmptySeries(cairoDate, 30),
        topPages: [],
        deviceBreakdown: [],
        error: 'Supabase analytics tables are not created yet. Please execute the Analytics SQL migration in Supabase SQL Editor.',
      });
    }
  } catch (err) {
    console.error('Admin analytics error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve website analytics',
      details: err.message,
    });
  }
}

function generateEmptySeries(cairoDateStr, days = 7) {
  const result = [];
  const baseDate = new Date(`${cairoDateStr}T12:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      visits: 0,
      uniqueVisitors: 0,
      pageViews: 0,
    });
  }
  return result;
}
