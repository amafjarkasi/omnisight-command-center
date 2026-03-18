import React, { useMemo, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import PropTypes from 'prop-types';

export default function TopologyView({ nodes, connections, threats = [], selectedNodeId, onSelectNode }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // Layout super-nodes in an outer circle, normal nodes in inner clusters
  const layout = useMemo(() => {
    const superNodes = nodes.filter(n => n.type === 'super');
    const normalNodes = nodes.filter(n => n.type !== 'super');

    const positions = {};
    const radius = 350;
    const center = { x: 500, y: 500 };

    superNodes.forEach((node, i) => {
      const angle = (i / superNodes.length) * 2 * Math.PI;
      positions[node.id] = {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      };
    });

    // Group normal nodes by their closest super-node hubRegion (fallback to random if not matched)
    normalNodes.forEach((node) => {
        let parent = superNodes.find(s => s.region === node.hubRegion || node.region.startsWith(s.region.split('-')[0]));
        if(!parent && superNodes.length > 0) parent = superNodes[0];

        if (parent && positions[parent.id]) {
            const pX = positions[parent.id].x;
            const pY = positions[parent.id].y;
            // cluster around parent
            const jitterR = 50 + Math.random() * 80;
            const jitterA = Math.random() * 2 * Math.PI;
            positions[node.id] = {
                x: pX + jitterR * Math.cos(jitterA),
                y: pY + jitterR * Math.sin(jitterA),
            };
        } else {
             positions[node.id] = {
                x: center.x + (Math.random()-0.5) * 200,
                y: center.y + (Math.random()-0.5) * 200,
            };
        }
    });

    return positions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.map(n => n.id).join(',')]); // recalculate only when node list changes structurally

  return (
    <div className="w-full h-full relative bg-[#020510]">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.2) 0%, transparent 70%)' }} />

      <TransformWrapper
        initialScale={0.7}
        minScale={0.2}
        maxScale={4}
        centerOnInit
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-1.5 pointer-events-auto">
              <button onClick={() => zoomIn()} className="p-2 glass-panel rounded-none hover:bg-white/10 text-cyan-400 cursor-pointer"><ZoomIn size={15} /></button>
              <button onClick={() => zoomOut()} className="p-2 glass-panel rounded-none hover:bg-white/10 text-cyan-400 cursor-pointer"><ZoomOut size={15} /></button>
              <button onClick={() => resetTransform()} className="p-2 glass-panel rounded-none hover:bg-white/10 text-cyan-400 cursor-pointer"><Maximize2 size={15} /></button>
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
              <div style={{ width: 1000, height: 1000, position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 1000 1000">

                  {/* Grid background */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 240, 255, 0.05)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="1000" height="1000" fill="url(#grid)" />

                  {/* Links */}
                  {connections.map((c, i) => {
                    const p1 = layout[c.source.id];
                    const p2 = layout[c.target.id];
                    if (!p1 || !p2) return null;
                    return (
                      <line
                        key={`conn-${i}`}
                        x1={p1.x} y1={p1.y}
                        x2={p2.x} y2={p2.y}
                        stroke={c.isSuper ? 'rgba(168,85,247,0.3)' : 'rgba(34,211,238,0.15)'}
                        strokeWidth={c.isSuper ? 2 : 1}
                      />
                    );
                  })}

                  {/* Threats */}
                  {threats.map((t, i) => {
                     const p1 = layout[t.targetId] ? { x: layout[t.targetId].x + (Math.random()-0.5)*200, y: layout[t.targetId].y - 200 } : null; // fake source
                     const p2 = layout[t.targetId];
                     if(!p1 || !p2) return null;
                     return (
                         <line
                            key={`threat-${i}`}
                            x1={p1.x} y1={p1.y}
                            x2={p2.x} y2={p2.y}
                            stroke="rgba(239, 68, 68, 0.8)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            className="animate-pulse"
                         />
                     )
                  })}

                  {/* Nodes */}
                  {nodes.map(node => {
                    const p = layout[node.id];
                    if (!p) return null;
                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;
                    const isSuper = node.type === 'super';
                    const isThreatened = threats.some(t => t.targetId === node.id);

                    const r = isSuper ? 12 : 6;
                    const fill = isSelected ? '#fff' : isThreatened ? '#ef4444' : isSuper ? '#a855f7' : '#22d3ee';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${p.x}, ${p.y})`}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
                        style={{ cursor: 'pointer' }}
                      >
                         {/* Pulse ring for super or threatened */}
                         {(isSuper || isThreatened) && (
                            <circle r={r + 8} fill="none" stroke={fill} strokeWidth="1" opacity="0.4" className="animate-pulse" />
                         )}
                         {isSelected && (
                             <circle r={r + 14} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 2" className="animate-spin-dashed" />
                         )}
                         <circle r={r} fill={fill} opacity={node.status === 'Offline' ? 0.3 : 1} />
                         {(isSuper || isHovered || isSelected) && (
                           <text
                             y={-(r + 8)}
                             textAnchor="middle"
                             fill={fill}
                             fontSize={isSuper ? 12 : 10}
                             fontFamily="'Courier New', monospace"
                             fontWeight="bold"
                           >
                             {node.id}
                           </text>
                         )}
                         {/* Large invisible hit area */}
                         <circle r={25} fill="transparent" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

TopologyView.propTypes = {
  nodes: PropTypes.array.isRequired,
  connections: PropTypes.array.isRequired,
  threats: PropTypes.array,
  selectedNodeId: PropTypes.string,
  onSelectNode: PropTypes.func.isRequired
};
