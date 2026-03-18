import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
  verifyClient: (info, callback) => {
    const origin = info.origin;
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:4173'];

    if (allowedOrigins.includes(origin)) {
      callback(true);
    } else {
      console.warn(`Blocked unauthorized WebSocket connection attempt from origin: ${origin}`);
      callback(false, 403, 'Unauthorized');
    }
  }
});

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
      nodes.push({
        id: `ND-${1000 + nodes.length}`,
        name: isSuper ? hub.superName : `Core-${(Math.random() * 65535).toString(16).substr(0, 4).toUpperCase()}`,
        region: hub.region,
        ip: `${10 + hubIdx}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        status: Math.random() > 0.93 ? 'Warning' : 'Online',
        lat,
        lng,
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

let activeNodes = generateInitialNodes();
let globalConnectivity = 87;
let activeThreats = [];
let regionalActivity = [
  { region: 'NA', activity: 85 },
  { region: 'EU', activity: 72 },
  { region: 'AP', activity: 91 },
  { region: 'SA', activity: 48 },
  { region: 'AF', activity: 34 },
];

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

wss.on('connection', (ws) => {
  console.log('Client connected to telemetry stream');
  
  // Send initial data
  ws.send(JSON.stringify({ type: 'INIT', nodes: activeNodes }));


  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'COMMAND') {
        const cmd = parsed.payload;
        console.log(`Received command: ${cmd}`);

        let responsePayload = { text: `Command unrecognized: ${cmd}` };

        // ping
        if (cmd.startsWith('ping ')) {
          const target = cmd.split(' ')[1];
          const node = activeNodes.find(n => n.id === target || n.ip === target);
          if (node) {
            responsePayload = {
              text: `PING ${node.ip} (${node.id}): 56 data bytes\n64 bytes from ${node.ip}: icmp_seq=1 ttl=116 time=${node.latency} ms\n64 bytes from ${node.ip}: icmp_seq=2 ttl=116 time=${node.latency + Math.floor(Math.random()*10)} ms\n--- ${node.ip} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`,
              success: true
            };
          } else {
            responsePayload = { text: `ping: cannot resolve ${target}: Unknown host`, success: false };
          }
        }

        // scenario
        if (cmd.startsWith('scenario ')) {
           const scenario = cmd.split(' ')[1].toLowerCase();
           if (scenario === 'flare') {
              activeNodes.forEach(n => {
                 n.latency += 200 + Math.random() * 300;
                 if(Math.random() > 0.8) n.status = 'Degraded';
              });
              globalConnectivity -= 25;
              responsePayload = { text: 'SCENARIO INITIATED: Solar Flare. Global latencies increased dramatically.', success: true };
           } else if (scenario === 'cut') {
              const euNodes = activeNodes.filter(n => n.region.startsWith('EU'));
              euNodes.forEach(n => {
                 n.latency = 999;
                 n.status = 'Offline';
              });
              globalConnectivity -= 15;
              responsePayload = { text: 'SCENARIO INITIATED: Trans-Atlantic cable cut. EU nodes unreachable.', success: true };
           } else if (scenario === 'heal') {
              activeNodes = generateInitialNodes();
              globalConnectivity = 87;
              activeThreats = [];
              responsePayload = { text: 'SCENARIO INITIATED: Auto-healing sequence complete. Network restored.', success: true };
           } else {
              responsePayload = { text: `scenario: unknown scenario '${scenario}'. Available: flare, cut, heal`, success: false };
           }
        }

        // help
        if (cmd === 'help') {
          responsePayload = { text: 'Available commands:\nping [node_id/ip] - Ping a specific node\nscenario [flare/cut/heal] - Trigger global events\nclear - Clear terminal', success: true };
        }

        ws.send(JSON.stringify({ type: 'CMD_RESPONSE', payload: responsePayload, original: cmd }));
      }
    } catch(e) {
      console.error('Error parsing message', e);
    }
  });

  const interval = setInterval(() => {
    // 1. Connectivity
    globalConnectivity = Math.min(100, Math.max(60, globalConnectivity + (Math.random() * 4 - 2)));
    
    // 2. Throughput
    const throughputUpdate = { time: Date.now(), value: 40 + Math.random() * 60 };
    
    // 3. Optional Log
    let logUpdate = null;
    if (Math.random() > 0.55) {
      const types = ['INFO', 'WARN', 'ALERT'];
      const weights = [0.5, 0.3, 0.2];
      const rand = Math.random();
      let cumulative = 0;
      let logType = 'INFO';
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) { logType = types[i]; break; }
      }
      const msg = tickMessages[Math.floor(Math.random() * tickMessages.length)];
      logUpdate = { id: Date.now(), type: logType, timestamp: new Date().toISOString(), message: msg };
    }

    // 4. Update Node Stats (only sending deltas to save bandwidth)
    const nodeUpdates = activeNodes.map(node => {
      node.intensity = Math.max(0.1, Math.min(1, node.intensity + (Math.random() * 0.2 - 0.1)));
      node.latency = Math.max(5, Math.min(250, node.latency + (Math.floor(Math.random() * 8) - 4)));
      node.packets += Math.floor(Math.random() * 200);
      return { id: node.id, intensity: node.intensity, latency: node.latency, packets: node.packets };
    });

    // 5. Regional
    regionalActivity = regionalActivity.map(item => ({
      ...item,
      activity: Math.max(10, Math.min(100, item.activity + (Math.random() * 8 - 4))),
    }));


    // 6. Threat Intelligence
    // Remove expired threats (older than 10s)
    const now = Date.now();
    activeThreats = activeThreats.filter(t => now - t.timestamp < 10000);

    // Randomly generate new threat (20% chance per tick)
    if (Math.random() < 0.20 && activeNodes.length > 0) {
      const targetNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
      // Generate random source coordinates
      const sourceLat = (Math.random() * 160) - 80;
      const sourceLng = (Math.random() * 360) - 180;

      const threatTypes = ['DDoS', 'Intrusion Attempt', 'Data Exfiltration', 'Malware Beacon', 'Port Scan'];
      const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];

      const threat = {
        id: `THREAT-${Date.now()}`,
        type,
        source: { lat: sourceLat, lng: sourceLng },
        targetId: targetNode.id,
        timestamp: now
      };

      activeThreats.push(threat);

      // Override log update with this high-priority threat alert
      logUpdate = {
        id: Date.now(),
        type: 'ALERT',
        timestamp: new Date().toISOString(),
        message: `CRITICAL: ${type} detected targeting ${targetNode.name} (${targetNode.id})`
      };
    }

    // Broadcast tick payload
    ws.send(JSON.stringify({
      type: 'TICK',
      payload: {
        globalConnectivity,
        throughput: throughputUpdate,
        log: logUpdate,
        nodeUpdates,
        regionalActivity,
        activeThreats
      }
    }));
  }, 2000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

console.log('WebSocket Telemetry Server running on ws://localhost:8080');