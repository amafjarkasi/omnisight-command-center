import React, { useMemo } from 'react';
import { Activity, Cpu, TrendingUp, TrendingDown, Minus, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Area, AreaChart,
} from 'recharts';
import PropTypes from 'prop-types';

const REGION_CONFIG = {
  NA: { label: 'North America', flag: '🇺🇸' },
  EU: { label: 'Europe',        flag: '🇪🇺' },
  AP: { label: 'Asia-Pacific',  flag: '🌏' },
  SA: { label: 'South America', flag: '🌎' },
  AF: { label: 'Africa',        flag: '🌍' },
};

function activityColor(v) {
  if (v >= 75) return '#34d399';
  if (v >= 50) return '#fbbf24';
  return '#f87171';
}
function activityLabel(v) {
  if (v >= 75) return 'NOMINAL';
  if (v >= 50) return 'DEGRADED';
  return 'CRITICAL';
}

function ThroughputTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(2,5,20,0.96)', border: '1px solid rgba(0,240,255,0.3)',
      borderRadius: 0, padding: '7px 12px', fontFamily: 'monospace', fontSize: 12, color: '#67e8f9',
    }}>
      {payload[0].value.toFixed(1)}<span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>Mbps</span>
    </div>
  );
}

export default function IntelligenceHub({ data }) {
  const { globalConnectivity, throughput, regionalActivity } = data;

  const tpAnalytics = useMemo(() => {
    if (!throughput?.length) return { current: 0, avg: 0, peak: 0, trendPct: 0, dir: 'flat' };
    const vals = throughput.map(d => d.value);
    const current = vals[vals.length - 1];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const peak = Math.max(...vals);
    const half = Math.floor(vals.length / 2);
    const recentAvg = vals.slice(half).reduce((a, b) => a + b, 0) / (vals.length - half);
    const oldAvg = vals.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const trendPct = oldAvg ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0;
    const dir = Math.abs(trendPct) < 2 ? 'flat' : trendPct > 0 ? 'up' : 'down';
    return { current, avg, peak, trendPct, dir };
  }, [throughput]);

  const connStatus = globalConnectivity >= 85 ? 'green' : globalConnectivity >= 65 ? 'amber' : 'red';
  const connAccent = { green: '#34d399', amber: '#fbbf24', red: '#f87171' }[connStatus];
  const connLabel  = { green: 'NOMINAL', amber: 'DEGRADED', red: 'CRITICAL' }[connStatus];

  return (
    <div className="glass-panel flex flex-col h-full overflow-y-auto" style={{ borderRadius: 0, padding: 0 }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Cpu size={18} className="neon-text-blue flex-shrink-0" />
        <span className="text-sm font-bold tracking-widest neon-text-blue uppercase">Intelligence Hub</span>
      </div>

      {/* ── Global Connectivity ── */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Global Connectivity</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-none animate-pulse" style={{ background: connAccent }} />
            <span className="text-xs font-bold uppercase" style={{ color: connAccent }}>{connLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Ring */}
          <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={connAccent} strokeWidth="8"
                strokeDasharray="251" strokeDashoffset={251 - (251 * globalConnectivity) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                transform="rotate(-90 48 48)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white leading-none">{Math.round(globalConnectivity)}%</span>
              <span className="text-[10px] text-white/35 uppercase mt-0.5 tracking-wider">ONLINE</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2.5">
            {[
              { label: 'Uptime',       value: '99.97%',                                       ok: true },
              { label: 'Active Zones', value: '5 / 5',                                        ok: true },
              { label: 'Failovers',    value: globalConnectivity < 75 ? '1 active' : 'None',  ok: globalConnectivity >= 75 },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-white/40">{label}</span>
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white/75">
                  {ok
                    ? <CheckCircle size={11} className="text-emerald-400" />
                    : <AlertTriangle size={11} className="text-amber-400" />}
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── System Throughput ── */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">System Throughput</span>
          </div>
          <div className="flex items-center gap-1.5">
            {tpAnalytics.dir === 'up'   && <TrendingUp   size={13} className="text-emerald-400" />}
            {tpAnalytics.dir === 'down' && <TrendingDown size={13} className="text-red-400" />}
            {tpAnalytics.dir === 'flat' && <Minus        size={13} className="text-white/30" />}
            <span className={`text-xs font-bold ${tpAnalytics.dir === 'up' ? 'text-emerald-400' : tpAnalytics.dir === 'down' ? 'text-red-400' : 'text-white/30'}`}>
              {tpAnalytics.dir !== 'flat' ? `${Math.abs(tpAnalytics.trendPct).toFixed(1)}%` : 'STABLE'}
            </span>
          </div>
        </div>

        {/* Live value */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold font-mono text-white leading-none">{tpAnalytics.current.toFixed(1)}</span>
          <span className="text-sm text-white/35 font-mono">Mbps</span>
        </div>
        <div className="text-xs text-white/25 font-mono mb-3">
          avg {tpAnalytics.avg.toFixed(0)} · peak {tpAnalytics.peak.toFixed(0)} Mbps
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughput} margin={{ top: 4, right: 2, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickFormatter={t => {
                  const d = new Date(t);
                  return `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
                }}
                stroke="rgba(255,255,255,0.08)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={45}
              />
              <YAxis
                domain={[0, 110]}
                stroke="rgba(255,255,255,0.08)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}
                tickLine={false}
                ticks={[0, 50, 100]}
                width={26}
              />
              <ReferenceLine y={tpAnalytics.avg} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
              <Tooltip content={<ThroughputTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill="url(#tpGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ background: '#38bdf8' }} />
            <span className="text-[10px] text-white/25 font-mono">live</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 border-t border-dashed border-white/15" />
            <span className="text-[10px] text-white/25 font-mono">avg</span>
          </div>
        </div>
      </div>

      {/* ── Regional Activity ── */}
      <div className="px-5 py-5 flex-1">
        <div className="flex items-center gap-2 mb-5">
          <Wifi size={14} className="text-purple-400" />
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Regional Activity</span>
        </div>

        <div className="space-y-4">
          {regionalActivity.map(({ region, activity }) => {
            const cfg = REGION_CONFIG[region] || { label: region, flag: '🌐' };
            const color = activityColor(activity);
            const status = activityLabel(activity);
            return (
              <div key={region}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{cfg.flag}</span>
                    <span className="text-xs font-semibold text-white/70">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-none"
                      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
                    >
                      {status}
                    </span>
                    <span className="text-sm font-mono font-bold text-white w-9 text-right">{Math.round(activity)}%</span>
                  </div>
                </div>
                <div className="relative h-2 rounded-none overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-none transition-all duration-700"
                    style={{
                      width: `${Math.round(activity)}%`,
                      background: `linear-gradient(90deg, ${color}88, ${color})`,

                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-5 pt-4 flex justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs text-white/30 uppercase tracking-wider">Weighted avg</span>
          <span className="text-sm font-mono font-bold text-white/55">
            {Math.round(regionalActivity.reduce((a, b) => a + b.activity, 0) / regionalActivity.length)}%
          </span>
        </div>
      </div>
    </div>
  );
}

IntelligenceHub.propTypes = {
  data: PropTypes.shape({
    globalConnectivity: PropTypes.number.isRequired,
    throughput: PropTypes.array.isRequired,
    regionalActivity: PropTypes.array.isRequired,
  }).isRequired,
};

ThroughputTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};
