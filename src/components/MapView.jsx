import React, { useMemo, useState, Suspense } from 'react';
import { Crosshair, Globe2, Map as MapIcon, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import PropTypes from 'prop-types';

// Lazy load the heavy 3D globe component
const GlobeView = React.lazy(() => import('./GlobeView'));

// ── World topojson ─────────────────────────────────────────────────────────
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ── MapToolkit terrain background for 2D ──────────────────────────────────
const TERRAIN_BG = `/maptoolkit-api/staticmap?center=20,10&zoom=1&size=1200x660&maptype=toursprung-terrain&apikey=${import.meta.env.VITE_MAPTOOLKIT_API_KEY}&factor=1`;

// ── Connection builder ─────────────────────────────────────────────────────
function buildConnections(nodes) {
  const conns = [];
  const used = new Set();

  const n = nodes.length;
  // Precompute lat/lng in radians for performance
  const rads = new Array(n);
  const PI_180 = Math.PI / 180;

  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    const latR = node.lat * PI_180;
    const lngR = node.lng * PI_180;
    rads[i] = {
      node: node,
      latR: latR,
      lngR: lngR,
      cosLatR: Math.cos(latR)
    };
  }

  for (let i = 0; i < n; i++) {
    const nodeData = rads[i];
    const node = nodeData.node;
    const k = node.type === 'super' ? 4 : 2;

    // Arrays for tracking top K
    const topK_sin2 = new Float64Array(k);
    for (let x=0; x<k; x++) topK_sin2[x] = Infinity;
    const topK_idx = new Int32Array(k);
    for (let x=0; x<k; x++) topK_idx[x] = -1;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const targetData = rads[j];

      const dLat_half = (targetData.latR - nodeData.latR) / 2;
      const dLng_half = (targetData.lngR - nodeData.lngR) / 2;
      const sin_dLat = Math.sin(dLat_half);
      const sin_dLng = Math.sin(dLng_half);

      const sin2 = sin_dLat * sin_dLat +
        nodeData.cosLatR * targetData.cosLatR * sin_dLng * sin_dLng;

      // Find worst in topK
      let worstIdx = 0;
      let worstSin2 = topK_sin2[0];
      for (let x = 1; x < k; x++) {
        if (topK_sin2[x] > worstSin2) {
          worstSin2 = topK_sin2[x];
          worstIdx = x;
        }
      }

      // If better than worst, replace it
      if (sin2 < worstSin2) {
        topK_sin2[worstIdx] = sin2;
        topK_idx[worstIdx] = j;
      }
    }

    // Now process the top K
    for (let x = 0; x < k; x++) {
      const targetIdx = topK_idx[x];
      if (targetIdx === -1) continue;

      const target = rads[targetIdx].node;

      // Optimization: use IDs for faster key
      const id1 = node.id;
      const id2 = target.id;
      const key = id1 < id2 ? id1 + '|' + id2 : id2 + '|' + id1;

      if (!used.has(key)) {
        used.add(key);
        const isSuper = node.type === 'super' || target.type === 'super';
        conns.push({
          source: node,
          target,
          isSuper,
          intensity: Math.max(node.intensity, target.intensity),
          color: isSuper
            ? ['rgba(168,85,247,0.0)', 'rgba(168,85,247,0.9)', 'rgba(168,85,247,0.0)']
            : ['rgba(0,240,255,0.0)', 'rgba(0,240,255,0.75)', 'rgba(0,240,255,0.0)'],
        });
      }
    }
  }
  return conns;
}

// ── 2D Flat Map View ───────────────────────────────────────────────────────
function FlatMapView({ nodes, connections, onSelectNode, selectedNodeId }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  return (
    <TransformWrapper
      initialScale={0.95}
      minScale={0.2}
      maxScale={8}
      wheel={{ step: 0.07 }}
      centerOnInit
      limitToBounds={false}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <>
          {/* Zoom controls */}
          <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-1.5 pointer-events-auto">
            <button aria-label="Zoom in" onClick={() => zoomIn()} className="p-2 glass-panel rounded-none hover:bg-white/10 text-cyan-400 cursor-pointer"><ZoomIn size={15} /></button>
            <button aria-label="Zoom out" onClick={() => zoomOut()} className="p-2 glass-panel rounded-none hover:bg-white/10 text-cyan-400 cursor-pointer"><ZoomOut size={15} /></button>
            <button aria-label="Reset zoom" onClick={() => resetTransform()} className="p-2 glass-panel rounded-none hover:bg-white/10 text-cyan-400 cursor-pointer"><Maximize2 size={15} /></button>
          </div>

          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%' }}
          >
            <div style={{ width: 1200, height: 660, position: 'relative' }}>

              {/* ── MapToolkit terrain background ── */}
              <img
                src={TERRAIN_BG}
                alt="terrain"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  opacity: 0.65,
                  filter: 'saturate(0.6) brightness(0.75) hue-rotate(200deg)',
                  pointerEvents: 'none',
                }}
              />

              {/* ── Overlay: transparent countries + nodes ── */}
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 147, center: [10, 20] }}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map(geo => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="transparent"
                        stroke="rgba(0,240,255,0.2)"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover: { outline: 'none', fill: 'rgba(0,240,255,0.04)' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Connection lines — rendered as SVG curves */}
                {connections.map((conn, i) => {
                  // Simple straight-line connections within the SVG coordinate system
                  return (
                    <line
                      key={`arc-${i}`}
                      x1={`${((conn.source.lng + 180) / 360) * 100}%`}
                      y1={`${((90 - conn.source.lat) / 180) * 100}%`}
                      x2={`${((conn.target.lng + 180) / 360) * 100}%`}
                      y2={`${((90 - conn.target.lat) / 180) * 100}%`}
                      stroke={conn.isSuper ? 'rgba(168,85,247,0.6)' : 'rgba(0,240,255,0.4)'}
                      strokeWidth={conn.isSuper ? 1.4 : 0.8}
                      strokeDasharray={conn.isSuper ? '6 4' : '0'}
                    />
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNode?.id === node.id;
                  const isSuper = node.type === 'super';
                  // bigger hit area
                  const R = isSuper ? 8 : 5.5;
                  const hitR = R + 6; // invisible hit radius — much easier to click
                  return (
                    <Marker key={node.id} coordinates={[node.lng, node.lat]}>
                      {/* Glow ring */}
                      {(isSelected || isHovered || isSuper) && (
                        <circle
                          r={R + 7}
                          fill="none"
                          stroke={isSuper ? '#a855f7' : '#00f0ff'}
                          strokeWidth="0.9"
                          opacity={isSelected ? 1 : 0.45}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                      {/* Visible dot */}
                      <circle
                        r={R}
                        fill={isSelected ? '#fff' : isSuper ? '#c084fc' : '#22d3ee'}
                        fillOpacity={0.96}
                        stroke={isSuper ? '#a855f7' : '#00f0ff'}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1}
                        style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                        cursor="pointer"
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={e => { e.stopPropagation(); onSelectNode(node); }}
                      />
                      {/* Invisible large hit area for easier clicking */}
                      <circle
                        r={hitR}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        cursor="pointer"
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={e => { e.stopPropagation(); onSelectNode(node); }}
                      />
                      {/* Label */}
                      {(isSelected || isHovered || isSuper) && (
                        <text
                          y={-(R + 8)}
                          textAnchor="middle"
                          fill={isSuper ? '#d8b4fe' : '#67e8f9'}
                          fontSize={isSuper ? 7.5 : 6.5}
                          fontFamily="'Courier New',monospace"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {node.id}
                        </text>
                      )}
                    </Marker>
                  );
                })}
              </ComposableMap>

              {/* Hover tooltip — positioned in canvas space */}
              {hoveredNode && (
                <div
                  className="absolute z-[999] glass-card pointer-events-none shadow-xl"
                  style={{
                    left: `${Math.min(1050, ((hoveredNode.lng + 180) / 360) * 1200 + 18)}px`,
                    top: `${Math.max(10, ((90 - hoveredNode.lat) / 180) * 660 - 64)}px`,
                    minWidth: 160,
                    borderLeft: `2px solid ${hoveredNode.type === 'super' ? '#a855f7' : '#00f0ff'}`,
                    borderRadius: 0,
                    padding: '8px 12px',
                  }}
                >
                  <div className="text-[11px] font-bold tracking-wider" style={{ color: hoveredNode.type === 'super' ? '#d8b4fe' : '#67e8f9' }}>{hoveredNode.id}</div>
                  <div className="text-[10px] text-white/70 mt-0.5">{hoveredNode.name}</div>
                  <div className="text-[9px] text-white/35 mt-1 font-mono">{hoveredNode.region} · {hoveredNode.latency}ms · {hoveredNode.lat.toFixed(1)}°N</div>
                  <div className="text-[9px] text-white/25 mt-0.5">Click to inspect ↗</div>
                </div>
              )}
            </div>
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
}

FlatMapView.propTypes = {
  nodes: PropTypes.array.isRequired,
  connections: PropTypes.array.isRequired,
  onSelectNode: PropTypes.func.isRequired,
  selectedNodeId: PropTypes.string,
};

// ── Main MapView ───────────────────────────────────────────────────────────
export default function MapView({ nodes, onSelectNode, selectedNodeId, flyToRef, viewMode, setViewMode }) {
  const connections = useMemo(
    () => buildConnections(nodes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes.map(n => n.id + n.type).join(',')]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020510', overflow: 'hidden' }}>

      {/* ── Node / link count badge (top-left) ── */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-none pointer-events-none select-none">
        <Crosshair size={12} className="neon-text-cyan animate-pulse" />
        <span className="text-[9px] tracking-widest text-emerald-400 uppercase font-bold">
          {nodes.length} nodes · {connections.length} links
        </span>
      </div>

      {/* ── View toggle (top-center) ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex glass-panel rounded-none p-1 gap-1">
        <button
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer
            ${viewMode === '3d' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-white/40 hover:text-white/70'}`}
        >
          <Globe2 size={12} /> 3D Globe
        </button>
        <button
          onClick={() => setViewMode('2d')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer
            ${viewMode === '2d' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'text-white/40 hover:text-white/70'}`}
        >
          <MapIcon size={12} /> 2D Map
        </button>
      </div>

      {/* ── Views (kept in DOM, just shown/hidden) ── */}
      <div style={{ width: '100%', height: '100%', display: viewMode === '3d' ? 'block' : 'none' }}>
        <Suspense fallback={
          <div className="flex w-full h-full items-center justify-center text-cyan-400/50">
            Loading 3D Engine...
          </div>
        }>
          <GlobeView
            nodes={nodes}
            connections={connections}
            onSelectNode={onSelectNode}
            selectedNodeId={selectedNodeId}
            flyToRef={flyToRef}
          />
        </Suspense>
      </div>
      <div style={{ width: '100%', height: '100%', display: viewMode === '2d' ? 'block' : 'none' }}>
        <FlatMapView
          nodes={nodes}
          connections={connections}
          onSelectNode={onSelectNode}
          selectedNodeId={selectedNodeId}
        />
      </div>
    </div>
  );
}

MapView.propTypes = {
  nodes: PropTypes.array.isRequired,
  onSelectNode: PropTypes.func.isRequired,
  selectedNodeId: PropTypes.string,
  flyToRef: PropTypes.object,
  viewMode: PropTypes.string.isRequired,
  setViewMode: PropTypes.func.isRequired,
};
