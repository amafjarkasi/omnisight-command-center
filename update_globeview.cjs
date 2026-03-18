const fs = require('fs');
let code = fs.readFileSync('src/components/GlobeView.jsx', 'utf8');

const search = `        pointColor={node => {
          if (node.id === selectedNodeId) return '#ffffff';
          return node.type === 'super' ? '#c084fc' : '#22d3ee';
        }}
        pointResolution={20}
        pointLabel={nodeTooltip}
        onPointClick={handleNodeClick}
        pointsMerge={false}

        // ── Rings ─────────────────────────────────────────────────────
        ringsData={nodes.filter(n => n.type === 'super' || n.id === selectedNodeId)}
        ringLat="lat"
        ringLng="lng"
        ringColor={n =>
          n.id === selectedNodeId
            ? () => 'rgba(255,255,255,0.85)'
            : n.type === 'super'
              ? () => 'rgba(192,132,252,0.65)'
              : () => 'rgba(34,211,238,0.6)'
        }
        ringMaxRadius={n => n.id === selectedNodeId ? 4.5 : 3}
        ringPropagationSpeed={2.2}
        ringRepeatPeriod={1100}

        // ── Arcs ──────────────────────────────────────────────────────
        arcsData={connections}
        arcStartLat={c => c.source.lat}
        arcStartLng={c => c.source.lng}
        arcEndLat={c => c.target.lat}
        arcEndLng={c => c.target.lng}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.1}
        arcDashAnimateTime={c => c.isSuper ? 2600 : 3800}
        arcStroke={c => c.isSuper ? 1.4 : 0.6}
        arcAltitude={c => {
          const dist = Math.sqrt(
            (c.target.lat - c.source.lat) ** 2 + (c.target.lng - c.source.lng) ** 2
          );
          return Math.min(0.5, dist / 250);
        }}
      />`;

const replace = `        pointColor={node => {
          if (node.id === selectedNodeId) return '#ffffff';
          return node.type === 'super' ? '#c084fc' : '#22d3ee';
        }}
        pointResolution={12}
        pointLabel={nodeTooltip}
        onPointClick={handleNodeClick}
        pointsMerge={false}

        // ── Rings ─────────────────────────────────────────────────────
        ringsData={nodes.filter(n => n.type === 'super' || n.id === selectedNodeId)}
        ringLat="lat"
        ringLng="lng"
        ringColor={n =>
          n.id === selectedNodeId
            ? () => 'rgba(255,255,255,0.85)'
            : n.type === 'super'
              ? () => 'rgba(192,132,252,0.65)'
              : () => 'rgba(34,211,238,0.6)'
        }
        ringMaxRadius={n => n.id === selectedNodeId ? 4.5 : 3}
        ringPropagationSpeed={2.2}
        ringRepeatPeriod={1100}

        // ── Arcs ──────────────────────────────────────────────────────
        arcsData={connections}
        arcStartLat={c => c.source.lat}
        arcStartLng={c => c.source.lng}
        arcEndLat={c => c.target.lat}
        arcEndLng={c => c.target.lng}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.1}
        arcDashAnimateTime={c => c.isSuper ? 2600 : 3800}
        arcStroke={c => c.isSuper ? 1.4 : 0.6}
        arcAltitude={c => c.altitude}
      />`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/components/GlobeView.jsx', code);
  console.log('Success: Replaced correctly');
} else {
  console.log('Error: Could not find code to replace');
}
