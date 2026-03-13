import { useState, useEffect } from 'react';

// ── Real-world datacenter hub locations ──────────────────────────────────────
const GEO_HUBS = [
  { region: 'NA-East',    lat: 40.71,  lng: -74.01,  superName: 'NY-Metro',   count: 5 },
  { region: 'NA-West',    lat: 34.05,  lng: -118.24, superName: 'LA-Core',    count: 4 },
  { region: 'NA-Central', lat: 41.88,  lng: -87.63,  superName: 'CHI-Hub',    count: 3 },
  { region: 'NA-North',   lat: 45.50,  lng: -73.57,  superName: 'MTL-Node',   count: 2 },
  { region: 'SA-East',    lat: -23.55, lng: -46.63,  superName: 'SP-Prime',   count: 4 },
  { region: 'SA-West',    lat: -12.05, lng: -77.04,  superName: 'LIM-Node',   count: 2 },
  { region: 'EU-West',    lat: 51.51,  lng: -0.13,   superName: 'LDN-Prime',  count: 5 },
  { region: 'EU-Central', lat: 50.11,  lng: 8.68,    superName: 'FRA-Core',   count: 4 },
  { region: 'EU-North',   lat: 59.33,  lng: 18.07,   superName: 'STO-Hub',    count: 3 },
  { region: 'EU-South',   lat: 41.90,  lng: 12.50,   superName: 'ROM-Node',   count: 2 },
  { region: 'AF-North',   lat: 30.04,  lng: 31.24,   superName: 'CAI-Prime',  count: 3 },
  { region: 'AF-South',   lat: -26.20, lng: 28.04,   superName: 'JHB-Hub',   count: 3 },
  { region: 'AF-West',    lat: 6.37,   lng: 3.92,    superName: 'LAG-Node',   count: 2 },
  { region: 'ME-Central', lat: 25.20,  lng: 55.27,   superName: 'DXB-Core',  count: 4 },
  { region: 'ME-West',    lat: 31.77,  lng: 35.22,   superName: 'TLV-Node',   count: 2 },
  { region: 'AS-South',   lat: 19.08,  lng: 72.88,   superName: 'BOM-Prime',  count: 4 },
  { region: 'AS-SE',      lat: 1.35,   lng: 103.82,  superName: 'SIN-Core',   count: 5 },
  { region: 'AS-East',    lat: 35.69,  lng: 139.69,  superName: 'TYO-Prime',  count: 5 },
  { region: 'AS-East',    lat: 22.32,  lng: 114.17,  superName: 'HKG-Hub',    count: 4 },
  { region: 'AS-East',    lat: 37.57,  lng: 126.98,  superName: 'SEL-Core',   count: 3 },
  { region: 'OC',         lat: -33.87, lng: 151.21,  superName: 'SYD-Prime',  count: 4 },
  { region: 'OC-NZ',     lat: -36.87, lng: 174.77,  superName: 'AKL-Node',   count: 2 },
];

// Convert lat/lng to map percentage coords (simple Mercator approximation)
function latLngToXY(lat, lng) {
  const x = ((lng + 180) / 360) * 100;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = ((Math.PI - mercN) / (2 * Math.PI)) * 100;
  return { x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) };
}

function generateInitialNodes() {
  const nodes = [];
  GEO_HUBS.forEach((hub, hubIdx) => {
    const hubCount = hub.count;
    for (let i = 0; i < hubCount; i++) {
      const isSuper = i === 0;
      const latJitter = (Math.random() - 0.5) * (isSuper ? 0 : 4);
      const lngJitter = (Math.random() - 0.5) * (isSuper ? 0 : 6);
      const lat = hub.lat + latJitter;
      const lng = hub.lng + lngJitter;
      const { x, y } = latLngToXY(lat, lng);
      nodes.push({
        id: `ND-${1000 + nodes.length}`,
        name: isSuper ? hub.superName : `Core-${(Math.random() * 65535).toString(16).substr(0, 4).toUpperCase()}`,
        region: hub.region,
        ip: `${10 + hubIdx}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        status: Math.random() > 0.93 ? 'Warning' : 'Online',
        lat,
        lng,
        x,
        y,
        intensity: isSuper ? 0.8 + Math.random() * 0.2 : Math.random() * 0.6 + 0.25,
        latency: Math.floor(Math.random() * 120) + 8,
        packets: Math.floor(Math.random() * 50000) + 1000,
        type: isSuper ? 'super' : 'normal',
        hubRegion: hub.region,
      });
    }
  });
  return nodes;
}

function generateInitialThroughput() {
  const data = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    data.push({ time: now - i * 1500, value: 40 + Math.random() * 60 });
  }
  return data;
}

function generateInitialLogs() {
  const types = ['INFO', 'WARN', 'ALERT'];
  const messages = [
    'Node sequence initialized',
    'Cross-region handshake complete',
    'Packet loss detected on subnet',
    'Firewall rule updated',
    'BGP route flap detected',
    'TLS certificate renewed',
    'DDoS mitigation active',
    'Load balancer rebalancing',
    'DNS propagation complete',
    'Redundancy failover triggered',
  ];
  const logs = [];
  const now = Date.now();
  for (let i = 0; i < 25; i++) {
    logs.push({
      id: now - i * 8000,
      type: types[Math.floor(Math.random() * types.length)],
      timestamp: new Date(now - i * 8000),
      message: messages[Math.floor(Math.random() * messages.length)],
    });
  }
  return logs;
}

export function useMockData() {
  const [globalConnectivity, setGlobalConnectivity] = useState(87);
  const [throughput, setThroughput] = useState(generateInitialThroughput);
  const [systemLogs, setSystemLogs] = useState(generateInitialLogs);
  const [activeNodes, setActiveNodes] = useState(generateInitialNodes);
  const [regionalActivity, setRegionalActivity] = useState([
    { region: 'NA', activity: 85 },
    { region: 'EU', activity: 72 },
    { region: 'AP', activity: 91 },
    { region: 'SA', activity: 48 },
    { region: 'AF', activity: 34 },
  ]);

  useEffect(() => {
    const tickMessages = [
      'Node sequence initialized',
      'Cross-region handshake complete',
      'Packet loss on subnet 10.4.x',
      'Firewall rule 443 updated',
      'BGP route flap — AS64512',
      'TLS certificate auto-renewed',
      'DDoS mitigation engaged',
      'Load balancer rebalancing pools',
      'DNS propagation complete',
      'Redundancy failover triggered',
      'Signal lost in sector 7G',
      'Re-routing via backup tunnel',
      'Unauthorized access attempt',
      'Connection latency spike detected',
      'Data stream nominal',
    ];

    const interval = setInterval(() => {
      setGlobalConnectivity(prev => Math.min(100, Math.max(60, prev + (Math.random() * 4 - 2))));

      setThroughput(prev => [
        ...prev.slice(1),
        { time: Date.now(), value: 40 + Math.random() * 60 },
      ]);

      if (Math.random() > 0.55) {
        setSystemLogs(prev => {
          const types = ['INFO', 'WARN', 'ALERT'];
          const weights = [0.5, 0.3, 0.2];
          const rand = Math.random();
          let cumulative = 0;
          let type = 'INFO';
          for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative) { type = types[i]; break; }
          }
          const msg = tickMessages[Math.floor(Math.random() * tickMessages.length)];
          return [{ id: Date.now(), type, timestamp: new Date(), message: msg }, ...prev.slice(0, 49)];
        });
      }

      // Update node intensities and stats — do NOT change lat/lng or type (causes globe re-render flash)
      setActiveNodes(prev => prev.map(node => ({
        ...node,
        intensity: Math.max(0.1, Math.min(1, node.intensity + (Math.random() * 0.2 - 0.1))),
        latency: Math.max(5, Math.min(250, node.latency + (Math.floor(Math.random() * 8) - 4))),
        packets: node.packets + Math.floor(Math.random() * 200),
      })));

      setRegionalActivity(prev => prev.map(item => ({
        ...item,
        activity: Math.max(10, Math.min(100, item.activity + (Math.random() * 8 - 4))),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const pushLog = (type, message) => {
    setSystemLogs(prev => [{ id: Date.now(), type, timestamp: new Date(), message }, ...prev.slice(0, 49)]);
  };

  return { globalConnectivity, throughput, systemLogs, activeNodes, regionalActivity, pushLog };
}
