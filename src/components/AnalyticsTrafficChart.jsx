import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Users, ArrowUpRight } from 'lucide-react';

export default function AnalyticsTrafficChart({
  chart7d = [],
  chart30d = [],
  cairoDate = '',
}) {
  const [timeRange, setTimeRange] = useState('7d'); // '7d' | '30d'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const activeData = useMemo(() => {
    const raw = timeRange === '7d' ? chart7d : chart30d;
    if (!raw || raw.length === 0) return [];
    return raw;
  }, [timeRange, chart7d, chart30d]);

  // Aggregate stats for selected timeframe
  const summary = useMemo(() => {
    let totalVisits = 0;
    let totalUnique = 0;
    let maxVisits = 0;
    let peakDay = null;

    activeData.forEach((item) => {
      totalVisits += Number(item.visits) || 0;
      totalUnique += Number(item.uniqueVisitors) || 0;
      if ((Number(item.visits) || 0) > maxVisits) {
        maxVisits = Number(item.visits) || 0;
        peakDay = item.date;
      }
    });

    const avgDaily = activeData.length ? Math.round((totalVisits / activeData.length) * 10) / 10 : 0;

    return { totalVisits, totalUnique, maxVisits, peakDay, avgDaily };
  }, [activeData]);

  // SVG Chart Geometry Calculations
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 25;

  const maxVal = Math.max(
    5,
    ...activeData.map((d) => Math.max(Number(d.visits) || 0, Number(d.uniqueVisitors) || 0))
  );

  const points = useMemo(() => {
    if (!activeData.length) return [];
    const stepX = (chartWidth - paddingX * 2) / Math.max(1, activeData.length - 1);

    return activeData.map((d, i) => {
      const x = paddingX + i * stepX;
      const visitsVal = Number(d.visits) || 0;
      const uniqueVal = Number(d.uniqueVisitors) || 0;

      const yVisits = chartHeight - paddingY - (visitsVal / maxVal) * (chartHeight - paddingY * 2);
      const yUnique = chartHeight - paddingY - (uniqueVal / maxVal) * (chartHeight - paddingY * 2);

      return {
        ...d,
        x,
        yVisits,
        yUnique,
        index: i,
      };
    });
  }, [activeData, maxVal]);

  // Generate SVG path commands for Visits
  const visitsPath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.yVisits}`;
      // Smooth cubic bezier curves
      const prev = points[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.yVisits;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.yVisits;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.yVisits}`;
    }, '');
  }, [points]);

  const visitsAreaPath = useMemo(() => {
    if (!visitsPath || points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = chartHeight - paddingY;
    return `${visitsPath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [visitsPath, points]);

  // Generate SVG path commands for Unique Visitors
  const uniquePath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.yUnique}`;
      const prev = points[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.yUnique;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.yUnique;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.yUnique}`;
    }, '');
  }, [points]);

  // Format short date (e.g. "Oct 30" or "Fri")
  const formatDateLabel = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Chart Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Website Traffic Over Time
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Student visits & unique visitors tracked across Egyptian time (Africa/Cairo)
          </p>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold mr-2">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              Total Visits
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              Unique Visitors
            </span>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => {
                setTimeRange('7d');
                setHoveredPoint(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                setTimeRange('30d');
                setHoveredPoint(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Quick Period Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <p className="text-slate-400 font-medium">Period Visits</p>
          <p className="text-lg font-black text-blue-400 mt-0.5">{summary.totalVisits}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <p className="text-slate-400 font-medium">Period Unique</p>
          <p className="text-lg font-black text-emerald-400 mt-0.5">{summary.totalUnique}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <p className="text-slate-400 font-medium">Daily Average</p>
          <p className="text-lg font-black text-white mt-0.5">{summary.avgDaily} <span className="text-[11px] text-slate-500 font-normal">visits/day</span></p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <p className="text-slate-400 font-medium">Peak Day</p>
          <p className="text-lg font-black text-white mt-0.5 truncate">
            {summary.peakDay ? formatDateLabel(summary.peakDay) : 'None yet'}
          </p>
        </div>
      </div>

      {/* Interactive SVG Chart Container */}
      <div className="relative w-full overflow-hidden">
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-56 select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              {/* Blue Gradient for Visits Area */}
              <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>

              {/* Emerald Gradient for Unique */}
              <linearGradient id="uniqueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
              const val = Math.round(pct * maxVal);
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#1E293B"
                    strokeDasharray={idx === 0 ? 'none' : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 3}
                    fill="#64748B"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area Path for Visits */}
            {visitsAreaPath && (
              <path d={visitsAreaPath} fill="url(#visitsGradient)" />
            )}

            {/* Visits Line */}
            {visitsPath && (
              <path
                d={visitsPath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Unique Visitors Line */}
            {uniquePath && (
              <path
                d={uniquePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover vertical crosshair */}
            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={paddingY}
                x2={hoveredPoint.x}
                y2={chartHeight - paddingY}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1.5"
              />
            )}

            {/* Interactive Points & Tooltips */}
            {points.map((p) => {
              const isHovered = hoveredPoint?.index === p.index;
              const stepX = (chartWidth - paddingX * 2) / Math.max(1, points.length - 1);

              return (
                <g key={p.index}>
                  {/* Invisible broad hitbox for easy touch / hover */}
                  <rect
                    x={p.x - stepX / 2}
                    y={0}
                    width={stepX}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onTouchStart={() => setHoveredPoint(p)}
                  />

                  {/* Visit point dot */}
                  <circle
                    cx={p.x}
                    cy={p.yVisits}
                    r={isHovered ? 6 : 3.5}
                    fill="#3B82F6"
                    stroke="#0B1120"
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* Unique point dot */}
                  <circle
                    cx={p.x}
                    cy={p.yUnique}
                    r={isHovered ? 5 : 3}
                    fill="#10B981"
                    stroke="#0B1120"
                    strokeWidth="2"
                    className="transition-all"
                  />
                </g>
              );
            })}

            {/* X-Axis Date Labels */}
            {points.map((p, idx) => {
              // For 30d show label every 4 days to avoid overlapping
              const shouldShowLabel =
                timeRange === '7d'
                  ? true
                  : idx % 4 === 0 || idx === points.length - 1;

              if (!shouldShowLabel) return null;

              return (
                <text
                  key={`label-${p.index}`}
                  x={p.x}
                  y={chartHeight - 6}
                  fill={p.date === cairoDate ? '#60A5FA' : '#64748B'}
                  fontWeight={p.date === cairoDate ? 'bold' : 'normal'}
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {formatDateLabel(p.date)}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5"
            style={{
              left: Math.min(
                Math.max(10, (hoveredPoint.x / chartWidth) * 100),
                80
              ) + '%',
              top: '15px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-white border-b border-slate-800 pb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{hoveredPoint.date}</span>
              {hoveredPoint.date === cairoDate && (
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-900/60 text-blue-300 rounded font-normal">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Total Visits:
              </span>
              <span className="font-bold text-white font-mono">{hoveredPoint.visits}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Unique Visitors:
              </span>
              <span className="font-bold text-white font-mono">{hoveredPoint.uniqueVisitors}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
