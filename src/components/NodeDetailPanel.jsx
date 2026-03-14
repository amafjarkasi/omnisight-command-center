import React, { useEffect, useState, useCallback } from 'react';
import {
  X, Activity, Zap, Globe, MapPin, Mountain, Navigation,
  Server, Truck, Route, Clock, Wifi, ChevronRight, Copy, Check,
} from 'lucide-react';
import PropTypes from 'prop-types';
import { reverseGeocode, getElevation, staticMapUrl, fastRoute } from '../services/maptoolkit';

// ── Stat badge ────────────────────────────────────────────────────────────
function StatBadge(props) {
  const Icon = props.icon;
  const label = props.label;
  const value = props.value;
  const color = props.color || 'text-cyan-400';
  return (
    <div className="bg-white/[0.04] rounded-none p-3.5 border border-white/[0.07] flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon size={13} className={color} />
        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{label}</span>
      </div>
      <div className="text-base font-bold text-white font-mono leading-none">{value}</div>
    </div>
  );
}

// ── Maneuver icon text ────────────────────────────────────────────────────
// ── Copy button ───────────────────────────────────────────────────────────
function CopyIconButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center ml-1.5 text-white/40 hover:text-white transition-colors cursor-pointer" title="Copy to clipboard">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}
CopyIconButton.propTypes = { text: PropTypes.string.isRequired };

const MANEUVER_ICON = {
  turn: '↱', 'new name': '→', depart: '⊙', arrive: '⊛',
  merge: '⇝', fork: '⑂', roundabout: '↻', rotary: '↻',
  'roundabout turn': '↻', continue: '↑', default: '→',
};

function maneuverIcon(type) {
  return MANEUVER_ICON[type] || MANEUVER_ICON.default;
}

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

// ── Main component ────────────────────────────────────────────────────────
export default function NodeDetailPanel({ node, nearestNode, onClose, onDiagnostic, pushLog }) {
  const [geoInfo, setGeoInfo]     = useState(null);
  const [elevation, setElevation] = useState(null);
  const [mapImg, setMapImg]       = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError]         = useState(null);

  // ── Geo + map + elevation fetch ──────────────────────────────────────────
  const fetchGeoData = useCallback(async () => {
    if (!node?.lat || !node?.lng) return;
    setLoading(true);
    setError(null);
    setGeoInfo(null);
    setElevation(null);
    setMapImg(null);
    setRouteInfo(null);

    try {
      setMapImg(staticMapUrl({ lat: node.lat, lng: node.lng }, {
        zoom: 8, size: '600x220', maptype: 'toursprung-terrain',
      }));

      const [geo, elev] = await Promise.all([
        reverseGeocode({ lat: node.lat, lng: node.lng }),
        getElevation([{ lat: node.lat, lng: node.lng }]),
      ]);
      setGeoInfo(geo);
      setElevation(Math.round(elev[0]));
    } catch (e) {
      setError('Geographic data unavailable');
      console.warn('MapToolkit fetch error:', e);
      if (pushLog) pushLog('WARN', `Geographic data query failed for ${node.id}`);
    } finally {
      setLoading(false);
    }
  }, [node, pushLog]);

  // ── FastRoute fetch (nearest same-region node) ───────────────────────────
  const fetchRoute = useCallback(async () => {
    if (!node || !nearestNode) return;
    setRouteLoading(true);
    try {
      const result = await fastRoute(
        { lat: node.lat, lng: node.lng },
        { lat: nearestNode.lat, lng: nearestNode.lng },
      );
      setRouteInfo(result);
    } catch {
      setRouteInfo(null);
      if (pushLog) pushLog('WARN', `FastRouting engine unavailable for ${node.id}`);
    } finally {
      setRouteLoading(false);
    }
  }, [node, nearestNode, pushLog]);

  useEffect(() => { fetchGeoData(); }, [fetchGeoData]);
  useEffect(() => { fetchRoute();   }, [fetchRoute]);

  if (!node) return null;

  const isSuper     = node.type === 'super';
  const accentColor = isSuper ? '#8b5cf6' : '#38bdf8';
  const accentBg    = isSuper ? 'rgba(168,85,247,0.08)' : 'rgba(0,240,255,0.06)';
  const accentBorder = isSuper ? 'rgba(168,85,247,0.35)' : 'rgba(0,240,255,0.25)';

  return (
    <div
      className="glass-panel rounded-none overflow-hidden flex flex-col"
      style={{ border: `1px solid ${accentBorder}`, maxHeight: '85vh', overflowY: 'auto' }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between p-4 pb-3" style={{ borderBottom: `1px solid ${accentBorder}`, background: accentBg }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none flex items-center justify-center flex-shrink-0" style={{ background: accentBg, border: `1px solid ${accentColor}60` }}>
            <Server size={15} style={{ color: accentColor }} />
          </div>
          <div>
            <div className="text-xs tracking-widest font-bold" style={{ color: accentColor }}>{node.id}</div>
            <div className="text-sm font-semibold text-white leading-tight mt-0.5">{node.name}</div>
          </div>
        </div>
        <button aria-label="Close panel" onClick={onClose} className="p-1.5 rounded-none hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* ── Static Map Thumbnail ── */}
      <div className="relative overflow-hidden" style={{ height: 110, background: '#0a0f1e' }}>
        {mapImg ? (
          <img src={mapImg} alt="Node region map" className="w-full h-full object-cover"
            style={{ opacity: 0.85, filter: 'saturate(0.7) brightness(0.9)' }} onError={() => setMapImg(null)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-xs text-white/20 tracking-widest uppercase">Loading map…</div>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(2,5,20,0.95) 100%)' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-4 h-4 rounded-none border-2 flex items-center justify-center" style={{ borderColor: accentColor }}>
              <div className="w-1 h-1 rounded-none" style={{ background: accentColor }} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-none border opacity-40" style={{ borderColor: accentColor }} />
          </div>
        </div>
        <div className="absolute bottom-2 left-3 text-[10px] font-mono text-white/50 pointer-events-none">
          {node.lat.toFixed(4)}°N · {Math.abs(node.lng).toFixed(4)}{node.lng < 0 ? '°W' : '°E'}
        </div>
      </div>

      {/* ── Geo Info ── */}
      <div className="px-4 py-3" style={{ borderBottom: 'rgba(255,255,255,0.06) 1px solid' }}>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-white/30 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-none animate-pulse" style={{ background: accentColor }} />
            Querying geographic data…
          </div>
        )}
        {error && <div className="text-xs text-red-400/60">{error}</div>}
        {geoInfo && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MapPin size={12} style={{ color: accentColor }} className="flex-shrink-0" />
              <span className="text-sm text-white/80 font-medium leading-tight">
                {geoInfo.city}{geoInfo.state ? `, ${geoInfo.state}` : ''}
              </span>
              {geoInfo.countryCode && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-none" style={{ background: accentBg, color: accentColor, border: `1px solid ${accentColor}40` }}>
                  {geoInfo.countryCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Globe size={12} className="text-white/30 flex-shrink-0" />
              <span className="text-xs text-white/45">{geoInfo.country}</span>
            </div>
            {geoInfo.postcode && (
              <div className="flex items-center gap-2">
                <Navigation size={12} className="text-white/20 flex-shrink-0" />
                <span className="text-xs text-white/30 font-mono">{geoInfo.postcode}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Node Stats Grid ── */}
      <div className="p-4 grid grid-cols-2 gap-2.5">
        <StatBadge icon={Activity} label="Latency"   value={`${node.latency} ms`}              color={node.latency > 100 ? 'text-yellow-400' : 'text-cyan-400'} />
        <StatBadge icon={Zap}      label="Packets"   value={`${(node.packets / 1000).toFixed(1)}k`} color="text-purple-400" />
        {elevation !== null && (
          <StatBadge icon={Mountain} label="Elevation" value={`${elevation} m`} color="text-emerald-400" />
        )}
        <StatBadge icon={Server} label="Status" value={node.status} color={node.status === 'Online' ? 'text-emerald-400' : 'text-yellow-400'} />
      </div>

      {/* ── FastRouting Ground Route ── */}
      {nearestNode && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 14 }}>
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            <Route size={13} className="text-orange-400" />
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Ground Route</span>
            <span className="ml-auto text-[10px] text-white/25 font-mono">→ {nearestNode.id}</span>
          </div>

          {routeLoading && (
            <div className="px-4 flex items-center gap-2 text-xs text-white/25">
              <div className="w-1.5 h-1.5 rounded-none animate-pulse bg-orange-400" />
              Routing via FastRouting OSRM…
            </div>
          )}

          {routeInfo && (
            <div className="px-4 space-y-3">
              {/* Routable result */}
              {routeInfo.routable ? (
                <>
                  {/* Road vs fiber comparison */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-orange-500/[0.07] border border-orange-500/20 rounded-none p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Truck size={11} className="text-orange-400" />
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Road</span>
                      </div>
                      <div className="text-base font-bold font-mono text-white">{routeInfo.distance_km?.toLocaleString()} km</div>
                      <div className="text-xs text-white/35 font-mono flex items-center gap-1">
                        <Clock size={9} className="text-orange-400/60" />
                        {routeInfo.duration_min >= 60
                          ? `${Math.floor(routeInfo.duration_min / 60)}h ${routeInfo.duration_min % 60}m`
                          : `${routeInfo.duration_min} min`}
                      </div>
                    </div>
                    <div className="bg-cyan-500/[0.07] border border-cyan-500/20 rounded-none p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Wifi size={11} className="text-cyan-400" />
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Fiber</span>
                      </div>
                      <div className="text-base font-bold font-mono text-white">{routeInfo.haversine_km?.toLocaleString()} km</div>
                      <div className="text-xs text-cyan-300/60 font-mono">RTT {routeInfo.fiber_latency_ms} ms</div>
                    </div>
                  </div>

                  {/* Turn-by-turn steps (first 4) */}
                  {routeInfo.steps?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-2">Turn-by-turn</div>
                      {routeInfo.steps.slice(0, 4).map((step, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1 px-2 rounded-none hover:bg-white/[0.03] transition-colors group">
                          <span className="text-sm font-mono text-orange-400/80 w-4 text-center flex-shrink-0">{maneuverIcon(step.maneuver)}</span>
                          <span className="text-xs text-white/55 flex-1 truncate capitalize">{step.name || 'Continue'}</span>
                          <span className="text-[10px] font-mono text-white/25 flex-shrink-0">{fmtDist(step.distance_m)}</span>
                        </div>
                      ))}
                      {routeInfo.steps.length > 4 && (
                        <div className="text-[10px] text-white/20 text-center pt-1">
                          +{routeInfo.steps.length - 4} more segments
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Non-routable (intercontinental) — show haversine + fiber only */
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-none p-3 flex items-center gap-3">
                  <Wifi size={14} className="text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-white/50">Subsea cable · {routeInfo.haversine_km?.toLocaleString()} km</div>
                    <div className="text-xs font-mono text-cyan-300/60">Fiber RTT ≈ {routeInfo.fiber_latency_ms} ms</div>
                  </div>
                  <ChevronRight size={12} className="text-white/20 ml-auto" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Region & IP ── */}
      <div className="px-4 pb-4 space-y-3" style={{ paddingTop: 14 }}>
        {[
          { label: 'Region',     value: node.region },
          { label: 'IP Address', value: node.ip,  mono: true, accent: true },
          { label: 'Type',       value: isSuper ? 'SUPER NODE' : 'STANDARD' },
        ].map(({ label, value, mono, accent }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-xs text-white/35 uppercase tracking-widest font-bold">{label}</span>
            <span
              className={`flex items-center text-xs ${mono ? 'font-mono' : ''} ${accent ? 'px-2 py-1 rounded-none' : 'text-white/75'}`}
              style={accent ? { background: accentBg, color: accentColor } : {}}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div className="p-4 pt-2">
        <button
          onClick={() => onDiagnostic(node)}
          className="w-full py-2.5 rounded-none text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`, border: `1px solid ${accentColor}50`, color: accentColor }}
          onMouseEnter={e => e.currentTarget.style.background = `${accentColor}28`}
          onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`}
        >
          ⬡ Initiate Diagnostic
        </button>
      </div>
    </div>
  );
}

NodeDetailPanel.propTypes = {
  node: PropTypes.object,
  nearestNode: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDiagnostic: PropTypes.func.isRequired,
  pushLog: PropTypes.func,
};
