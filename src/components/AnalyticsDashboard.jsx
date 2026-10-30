import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Eye,
  TrendingUp,
  Calendar,
  RotateCcw,
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Radio,
} from 'lucide-react';
import AnalyticsTrafficChart from './AnalyticsTrafficChart';
import { MIGRATION_ANALYTICS_SQL } from '../lib/schemaSql';
import { useToast } from './Toast';

const AUTO_REFRESH_INTERVAL_MS = 20 * 1000; // Update counter every 20 seconds automatically

export default function AnalyticsDashboard({ dbStatus }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [analytics, setAnalytics] = useState({
    liveVisitors: 0,
    totalUniqueVisitors: 0,
    totalVisits: 0,
    todayVisitors: 0,
    todayVisits: 0,
    cairoDate: new Date().toISOString().split('T')[0],
    chart7d: [],
    chart30d: [],
    topPages: [],
    deviceBreakdown: [],
    requiresMigration: false,
    error: null,
  });

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setAnalytics({
          liveVisitors: Number(data.liveVisitors) || 0,
          totalUniqueVisitors: Number(data.totalUniqueVisitors) || 0,
          totalVisits: Number(data.totalVisits) || 0,
          todayVisitors: Number(data.todayVisitors) || 0,
          todayVisits: Number(data.todayVisits) || 0,
          cairoDate: data.cairoDate || new Date().toISOString().split('T')[0],
          chart7d: data.chart7d || [],
          chart30d: data.chart30d || [],
          topPages: data.topPages || [],
          deviceBreakdown: data.deviceBreakdown || [],
          requiresMigration: Boolean(data.requiresMigration),
          error: data.error || null,
        });
      } else {
        const errJson = await res.json().catch(() => ({}));
        addToast(errJson.error || 'Failed to load analytics data', 'error');
      }
    } catch (err) {
      console.warn('Analytics fetch warning:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [addToast]);

  // Initial fetch and auto-refresh timer (every 20s)
  useEffect(() => {
    fetchAnalytics(false);
    const timer = setInterval(() => {
      fetchAnalytics(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(MIGRATION_ANALYTICS_SQL);
    setCopiedSql(true);
    addToast('Analytics SQL migration copied to clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Website Traffic Analytics
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Tracking
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time monitoring of students, active sessions, and study platform usage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-mono hidden md:inline-block px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            Cairo Time: <strong className="text-white">{analytics.cairoDate}</strong>
          </span>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 transition-colors shadow-sm cursor-pointer"
            title="Refresh statistics now"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Migration Notice if Supabase Analytics tables not created yet */}
      {analytics.requiresMigration && (
        <div className="p-5 rounded-3xl bg-amber-950/30 border border-amber-500/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white text-sm">
                Activate Supabase Analytics Database Storage
              </p>
              <p className="text-amber-300/80 mt-1 leading-relaxed">
                Live visitors are being tracked in-memory, but to store historical traffic charts permanently across redeployments, run the 10-second Analytics SQL migration in your Supabase project (<code className="text-amber-200 font-mono">qksklthfpbcwseiqpajq</code>).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopySql}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedSql ? 'Copied SQL!' : 'Copy Analytics SQL'}
            </button>
            <a
              href="https://supabase.com/dashboard/project/qksklthfpbcwseiqpajq/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              Open SQL Editor <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* FOUR MAIN STATISTIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* CARD 1: LIVE VISITORS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0B1120] border border-emerald-500/30 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Radio className="w-20 h-20 text-emerald-400" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              Live Visitors
            </span>
            <span className="text-[10px] text-slate-500 font-mono">auto 20s</span>
          </div>

          <div className="mt-4">
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {loading ? '...' : analytics.liveVisitors}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Currently active on the website
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Last 5 minutes window</span>
              <span className="text-emerald-400/90 font-semibold">1 per person</span>
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL UNIQUE VISITORS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-20 h-20 text-blue-400" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Total Unique Visitors
            </span>
            <span className="text-[10px] text-slate-500 font-mono">all time</span>
          </div>

          <div className="mt-4">
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {loading ? '...' : analytics.totalUniqueVisitors}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Individual students & devices
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Persistent anonymous IDs</span>
              <span className="text-blue-400/90 font-semibold">De-duplicated</span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL WEBSITE VISITS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-20 h-20 text-indigo-400" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Total Website Visits
            </span>
            <span className="text-[10px] text-slate-500 font-mono">sessions</span>
          </div>

          <div className="mt-4">
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {loading ? '...' : analytics.totalVisits}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Total browsing sessions
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>30-minute session lifetime</span>
              <span className="text-indigo-400/90 font-semibold">Returning included</span>
            </div>
          </div>
        </div>

        {/* CARD 4: TODAY'S VISITORS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-20 h-20 text-amber-400" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Today's Visitors
            </span>
            <span className="text-[10px] text-amber-300/80 font-mono bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50">
              Cairo Date
            </span>
          </div>

          <div className="mt-4">
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {loading ? '...' : analytics.todayVisitors}
            </p>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Unique students today ({analytics.cairoDate})
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Today's Sessions:</span>
              <span className="text-amber-400 font-bold">{analytics.todayVisits}</span>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE TRAFFIC CHART (7 DAYS / 30 DAYS) */}
      <AnalyticsTrafficChart
        chart7d={analytics.chart7d}
        chart30d={analytics.chart30d}
        cairoDate={analytics.cairoDate}
      />

      {/* ADDITIONAL BREAKDOWN GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Visited Pages */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">Popular Website Sections</h3>
            </div>
            <span className="text-xs text-slate-400">Most visited student routes</span>
          </div>

          {analytics.topPages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Traffic routes will appear here as students browse courses and lectures.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topPages.map((page, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-blue-950 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-blue-800/40">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-slate-200 truncate font-semibold">
                      {page.path === '/' ? '/ (Home Page)' : page.path}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-white font-mono font-bold shrink-0 ml-2">
                    {page.count} {page.count === 1 ? 'visit' : 'visits'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Device Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400">Student devices</span>
          </div>

          <div className="space-y-3 pt-1">
            {['desktop', 'mobile', 'tablet'].map((dev) => {
              const matched = analytics.deviceBreakdown.find((d) => d.device === dev);
              const count = matched ? matched.count : 0;
              const total = analytics.totalUniqueVisitors || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={dev} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold capitalize text-slate-200">
                      {dev === 'desktop' ? (
                        <Monitor className="w-4 h-4 text-blue-400" />
                      ) : dev === 'mobile' ? (
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Tablet className="w-4 h-4 text-indigo-400" />
                      )}
                      {dev}
                    </span>
                    <span className="font-mono text-slate-400 font-semibold">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dev === 'desktop'
                          ? 'bg-blue-500'
                          : dev === 'mobile'
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Privacy, Tracking & Technical Architecture Details */}
      <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2.5">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Technical & Privacy Protections
        </div>
        <p className="leading-relaxed">
          • <strong>Admin Exclusion:</strong> Your administrative dashboard sessions are automatically excluded so visitor numbers reflect genuine student usage.
          <br />
          • <strong>Multi-Tab De-duplication:</strong> A single student opening multiple browser tabs is counted as exactly 1 live visitor.
          <br />
          • <strong>Privacy First:</strong> No personal student information or raw IP addresses are logged. Anonymous UUID tokens are used for session continuity.
          <br />
          • <strong>Timezone Precision:</strong> Daily visitor roll-overs strictly calculate in the <strong>Africa/Cairo</strong> timezone.
        </p>
      </div>
    </div>
  );
}
