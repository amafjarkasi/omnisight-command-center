const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.jsx', 'utf8');

const search = `// ── Haversine distance (km) ────────────────────────────────────────────────
function haversine(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

// ── Connection builder ─────────────────────────────────────────────────────
function buildConnections(nodes) {
  const conns = [];
  const used = new Set();
  nodes.forEach(node => {
    const k = node.type === 'super' ? 4 : 2;
    const nearest = nodes
      .filter(n => n.id !== node.id)
      .map(n => ({ target: n, dist: haversine(node, n) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);

    nearest.forEach(({ target }) => {
      const key = [node.id, target.id].sort().join('|');
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
    });
  });
  return conns;
}`;

const replace = `// ── Distance proxy (avoids expensive Math operations) ──────────────────────
function distanceProxy(a, b) {
  const dLat = a.latRad - b.latRad;
  const dLng = a.lngRad - b.lngRad;
  const sin2 = Math.sin(dLat / 2) ** 2 + a.cosLat * b.cosLat * Math.sin(dLng / 2) ** 2;
  return sin2;
}

// ── Connection builder ─────────────────────────────────────────────────────
function buildConnections(nodes) {
  const conns = [];
  const used = new Set();

  // Pre-calculate radians for optimization
  const nodesWithRad = nodes.map(n => ({
    ...n,
    latRad: n.lat * Math.PI / 180,
    lngRad: n.lng * Math.PI / 180,
    cosLat: Math.cos(n.lat * Math.PI / 180)
  }));

  nodesWithRad.forEach((node, i) => {
    const k = node.type === 'super' ? 4 : 2;

    // O(N) linear scan to find k nearest neighbors
    const nearest = [];
    for (let j = 0; j < nodesWithRad.length; j++) {
      if (i === j) continue;
      const target = nodesWithRad[j];
      const dist = distanceProxy(node, target);

      if (nearest.length < k) {
        nearest.push({ target, dist });
        if (nearest.length === k) nearest.sort((a, b) => b.dist - a.dist); // sort descending (max first)
      } else if (dist < nearest[0].dist) {
        nearest[0] = { target, dist };
        nearest.sort((a, b) => b.dist - a.dist);
      }
    }

    nearest.forEach(({ target }) => {
      const key = node.id < target.id ? \`\${node.id}|\${target.id}\` : \`\${target.id}|\${node.id}\`;
      if (!used.has(key)) {
        used.add(key);
        const isSuper = node.type === 'super' || target.type === 'super';

        // Precompute altitude for GlobeView
        const cartesianDist = Math.sqrt(
          (target.lat - node.lat) ** 2 + (target.lng - node.lng) ** 2
        );
        const altitude = Math.min(0.5, cartesianDist / 250);

        conns.push({
          source: nodes[i],
          target: nodes[nodesWithRad.indexOf(target)],
          isSuper,
          altitude,
          intensity: Math.max(node.intensity, target.intensity),
          color: isSuper
            ? ['rgba(168,85,247,0.0)', 'rgba(168,85,247,0.9)', 'rgba(168,85,247,0.0)']
            : ['rgba(0,240,255,0.0)', 'rgba(0,240,255,0.75)', 'rgba(0,240,255,0.0)'],
        });
      }
    });
  });
  return conns;
}`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/components/MapView.jsx', code);
  console.log('Success: Replaced correctly');
} else {
  console.log('Error: Could not find code to replace');
}
