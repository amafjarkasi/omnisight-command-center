import React, { useState } from 'react';
import { AlertCircle, Info, TriangleAlert, Radio } from 'lucide-react';
import PropTypes from 'prop-types';

const TYPE_CONFIG = {
  ALERT: { icon: AlertCircle, color: '#c084fc', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.4)' },
  WARN:  { icon: TriangleAlert, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.35)' },
  INFO:  { icon: Info,          color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: 'rgba(0,240,255,0.25)' },
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function SystemLogs({ logs }) {
  const [filter, setFilter] = useState('ALL');

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.type === filter);
  const counts = { ALERT: 0, WARN: 0, INFO: 0 };
  logs.forEach(l => { if (counts[l.type] !== undefined) counts[l.type]++; });

  return (
    <div
      className="glass-panel flex flex-col h-full pointer-events-auto"
      style={{ borderRadius: 0, padding: 0, overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div className="flex items-center gap-2.5">
          <Radio size={16} className="text-primary animate-pulse" />
          <span className="text-sm font-bold text-primary uppercase tracking-widest">System Events</span>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-none bg-blue-600/20 text-blue-300 border border-blue-500/25">
          {logs.length} Total
        </span>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 text-xs font-bold py-1.5 rounded-none transition-all cursor-pointer uppercase tracking-wide
            ${filter === 'ALL' ? 'bg-primary/30 text-white border border-primary/50' : 'text-white/40 hover:bg-white/5 border border-transparent'}`}
        >
          All
        </button>
        {['INFO', 'WARN', 'ALERT'].map(f => {
          const cfg = TYPE_CONFIG[f];
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-xs font-bold py-1.5 rounded-none transition-all cursor-pointer uppercase tracking-wide border
                ${active ? 'text-white' : 'text-white/40 hover:text-white/60 border-transparent hover:bg-white/[0.03]'}`}
              style={active ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color } : {}}
            >
              {f} <span className="opacity-60 ml-0.5 text-[10px]">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Log entries ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredLogs.map(log => {
          const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.INFO;
          const Icon = cfg.icon;
          return (
            <div
              key={log.id}
              style={{
                background: 'rgba(0,0,0,0.35)',
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: 0,
                padding: '10px 14px',
                flexShrink: 0,
                animation: 'fadeInLog 0.25s ease-out',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                  <span className="text-xs font-bold tracking-wider" style={{ color: cfg.color }}>{log.type}</span>
                </div>
                <span className="text-[11px] text-white/35 font-mono">{formatTime(log.timestamp)}</span>
              </div>
              <div className="text-sm text-white/80 leading-snug">{log.message}</div>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="text-center text-sm text-white/25 py-8 italic">No {filter.toLowerCase()} events found.</div>
        )}
      </div>

      <style>{`
        @keyframes fadeInLog {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

SystemLogs.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    timestamp: PropTypes.instanceOf(Date).isRequired,
    message: PropTypes.string.isRequired,
  })).isRequired,
};
