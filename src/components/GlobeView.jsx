import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Lock, Unlock, RefreshCw } from 'lucide-react';
import GlobeGL from 'react-globe.gl';
import PropTypes from 'prop-types';

const GLOBE_IMG = 'https://unpkg.com/three-globe@2/example/img/earth-night.jpg';
const STARS_IMG = 'https://unpkg.com/three-globe@2/example/img/night-sky.png';


const escapeHtml = (unsafe) => {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default function GlobeView({ nodes, connections, threats = [], onSelectNode, selectedNodeId, flyToRef }) {
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [holdProgress, setHoldProgress] = useState(0); // 0-100 for hold indicator
  const holdAnimRef = useRef(null);

  // Responsive resize
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Globe init
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.38;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 130;
    controls.maxDistance = 650;
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeRef.current]);

  // Sync auto-rotate to controls
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // Expose flyTo via ref (for geocode search)
  useEffect(() => {
    if (flyToRef) {
      flyToRef.current = (lat, lng, altitude = 1.6) => {
        setAutoRotate(false);
        if (globeRef.current) {
          globeRef.current.pointOfView({ lat, lng, altitude }, 900);
        }
        setTimeout(() => setAutoRotate(true), 7000);
      };
    }
  }, [flyToRef]);

  // Long-press handlers — hold 800ms to toggle rotation lock
  const HOLD_MS = 800;

  const startHold = useCallback(() => {
    setHoldProgress(0);
    const startTime = Date.now();
    holdAnimRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startTime) / HOLD_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        clearInterval(holdAnimRef.current);
        setAutoRotate(v => !v);
        setHoldProgress(0);
      }
    }, 16);
  }, []);

  const cancelHold = useCallback(() => {
    if (holdAnimRef.current) clearInterval(holdAnimRef.current);
    setHoldProgress(0);
  }, []);

  useEffect(() => () => { if (holdAnimRef.current) clearInterval(holdAnimRef.current); }, []);

  const handleNodeClick = useCallback((node, ev) => {
    ev?.stopPropagation?.();
    cancelHold();
    setAutoRotate(false);
    onSelectNode(node);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: node.lat, lng: node.lng, altitude: 1.6 }, 800);
    }
    setTimeout(() => setAutoRotate(true), 8000);
  }, [onSelectNode, cancelHold]);

  const nodeTooltip = useCallback(node => `
    <div style="
      background:rgba(2,5,20,0.95);
      border:1px solid ${node.type==='super'?'#a855f7':'#00f0ff'};
      color:${node.type==='super'?'#d8b4fe':'#67e8f9'};
      padding:8px 12px;border-radius:8px;
      font-family:'Courier New',monospace;font-size:12px;line-height:1.6;
      box-shadow:0 0 20px ${node.type==='super'?'rgba(168,85,247,0.45)':'rgba(0,240,255,0.45)'}
    ">
      <strong>${escapeHtml(node.id)}</strong><br/>
      ${escapeHtml(node.name)}<br/>
      <span style="color:rgba(255,255,255,0.45);font-size:10px">${escapeHtml(node.region)} · ${escapeHtml(node.latency)}ms · ${escapeHtml(node.status)}</span><br/>
      <span style="color:rgba(255,255,255,0.3);font-size:9px">${node.lat.toFixed(2)}°, ${node.lng.toFixed(2)}° — Click to inspect</span>
    </div>
  `, []);

  const circumference2pi = 2 * Math.PI * 18; // for SVG hold ring r=18

  const threatArcs = threats.map(t => {
    const targetNode = nodes.find(n => n.id === t.targetId);
    if (!targetNode) return null;
    return {
      source: t.source,
      target: targetNode,
      isThreat: true,
      id: t.id
    };
  }).filter(Boolean);

  const threatRings = threats.map(t => {
    const targetNode = nodes.find(n => n.id === t.targetId);
    if (!targetNode) return null;
    return targetNode;
  }).filter(Boolean);

  const combinedArcs = [...connections, ...threatArcs];

  // Create a combined rings array for regular rings and threat rings,
  // making sure not to duplicate nodes if they are already in the base rings.
  const baseRings = nodes.filter(n => n.type === 'super' || n.id === selectedNodeId);
  const combinedRings = [...baseRings];

  threatRings.forEach(tr => {
    if (!combinedRings.find(r => r.id === tr.id)) {
      combinedRings.push(tr);
    }
  });



  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: autoRotate ? 'grab' : 'crosshair' }}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
    >
      <GlobeGL
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        globeImageUrl={GLOBE_IMG}
        bumpImageUrl={GLOBE_IMG}
        backgroundImageUrl={STARS_IMG}
        atmosphereColor="#00a4cc"
        atmosphereAltitude={0.2}

        // ── Points ────────────────────────────────────────────────────
        pointsData={nodes}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0}
        // Larger radius for easier clicking
        pointRadius={node => node.type === 'super' ? 0.75 : 0.5}
        pointColor={node => {
          if (node.id === selectedNodeId) return '#ffffff';
          return node.type === 'super' ? '#c084fc' : '#22d3ee';
        }}
        pointResolution={12}
        pointLabel={nodeTooltip}
        onPointClick={handleNodeClick}
        pointsMerge={false}

        // ── Rings ─────────────────────────────────────────────────────
        ringsData={combinedRings}
        ringLat="lat"
        ringLng="lng"
        ringColor={n => {
          if (threatRings.find(tr => tr.id === n.id)) return () => 'rgba(239, 68, 68, 0.9)'; // Red for threats
          if (n.id === selectedNodeId) return () => 'rgba(255,255,255,0.85)';
          if (n.type === 'super') return () => 'rgba(192,132,252,0.65)';
          return () => 'rgba(34,211,238,0.6)';
        }}
        ringMaxRadius={n => threatRings.find(tr => tr.id === n.id) ? 6 : n.id === selectedNodeId ? 4.5 : 3}
        ringPropagationSpeed={n => threatRings.find(tr => tr.id === n.id) ? 4.0 : 2.2}
        ringRepeatPeriod={n => threatRings.find(tr => tr.id === n.id) ? 400 : 1100}

        // ── Arcs ──────────────────────────────────────────────────────
        arcsData={combinedArcs}
        arcStartLat={c => c.source.lat}
        arcStartLng={c => c.source.lng}
        arcEndLat={c => c.target.lat}
        arcEndLng={c => c.target.lng}
        arcColor={c => c.isThreat ? ['rgba(239,68,68,0)', 'rgba(239,68,68,1)', 'rgba(239,68,68,0)'] : c.color}
        arcDashLength={c => c.isThreat ? 0.8 : 0.4}
        arcDashGap={c => c.isThreat ? 0.2 : 0.1}
        arcDashAnimateTime={c => c.isThreat ? 1000 : c.isSuper ? 2600 : 3800}
        arcStroke={c => c.isThreat ? 2.0 : c.isSuper ? 1.4 : 0.6}
        arcAltitude={c => c.isThreat ? 0.6 : c.altitude}
      />

      {/* ── Hold-to-toggle ring indicator ── */}
      {holdProgress > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <circle
              cx="24" cy="24" r="18"
              fill="none"
              stroke={autoRotate ? '#f87171' : '#34d399'}
              strokeWidth="3"
              strokeDasharray={circumference2pi}
              strokeDashoffset={circumference2pi - (circumference2pi * holdProgress) / 100}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset 16ms linear' }}
            />
            {autoRotate
              ? <Lock size={12} x="18" y="18" className="text-red-400" fill="#f87171" />
              : <Unlock size={12} x="18" y="18" className="text-emerald-400" fill="#34d399" />
            }
          </svg>
        </div>
      )}

      {/* ── Rotation status — top-right corner (not hidden by sidebar) ── */}
      <div className="absolute top-16 right-4 z-50 pointer-events-auto">
        <button
          onClick={() => setAutoRotate(v => !v)}
          title="Click to toggle, or hold globe to toggle"
          className={`flex items-center gap-2 px-3 py-1.5 glass-panel rounded-none text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer
            ${autoRotate
              ? 'text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
              : 'text-red-400 border border-red-500/30'
            }`}
        >
          <RefreshCw size={10} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
          {autoRotate ? 'Rotating' : 'Locked'}
        </button>
      </div>
    </div>
  );
}

GlobeView.propTypes = {
  nodes: PropTypes.array.isRequired,
  connections: PropTypes.array.isRequired,
  threats: PropTypes.array,
  onSelectNode: PropTypes.func.isRequired,
  selectedNodeId: PropTypes.string,
  flyToRef: PropTypes.object,
};
