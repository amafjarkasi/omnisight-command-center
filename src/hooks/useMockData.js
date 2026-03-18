import { useState, useEffect, useCallback, useRef } from 'react';

function generateInitialThroughput() {
  const initialThroughput = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    initialThroughput.push({ time: now - i * 1500, value: 40 });
  }
  return initialThroughput;
}

export function useMockData() {
  const [globalConnectivity, setGlobalConnectivity] = useState(87);
  const [throughput, setThroughput] = useState(generateInitialThroughput);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activeNodes, setActiveNodes] = useState([]);
  const [regionalActivity, setRegionalActivity] = useState([]);
  const [activeThreats, setActiveThreats] = useState([]);

  const wsRef = useRef(null);

  useEffect(() => {
    let wsConnectTimeout;

    const connectWS = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setSystemLogs(prev => [{ id: Date.now(), type: 'INFO', timestamp: new Date(), message: 'Connected to Live Telemetry Stream' }, ...prev]);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'INIT') {
          setActiveNodes(data.nodes);
        } else if (data.type === 'TICK') {
          const { payload } = data;
          
          if (payload.globalConnectivity) setGlobalConnectivity(payload.globalConnectivity);
          
          if (payload.throughput) {
            setThroughput(prev => [...prev.slice(1), payload.throughput]);
          }
          
          if (payload.log) {
            setSystemLogs(prev => [{...payload.log, timestamp: new Date(payload.log.timestamp)}, ...prev.slice(0, 49)]);
          }
          
          if (payload.regionalActivity) {
            setRegionalActivity(payload.regionalActivity);
          }
          
          if (payload.activeThreats) {
            setActiveThreats(payload.activeThreats);
          }

          if (payload.nodeUpdates) {
            setActiveNodes(prev => prev.map(node => {
              const update = payload.nodeUpdates.find(u => u.id === node.id);
              if (update) {
                return { ...node, ...update };
              }
              return node;
            }));
          }
        }
      };

      ws.onclose = () => {
        setSystemLogs(prev => [{ id: Date.now(), type: 'WARN', timestamp: new Date(), message: 'Telemetry stream disconnected. Reconnecting...' }, ...prev.slice(0, 49)]);
        wsConnectTimeout = setTimeout(connectWS, 3000);
      };
      
      ws.onerror = () => {
        // Automatically handled by onclose usually
      };
    };

    connectWS();

    return () => {
      clearTimeout(wsConnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const pushLog = useCallback((type, message) => {
    setSystemLogs(prev => [{ id: Date.now(), type, timestamp: new Date(), message }, ...prev.slice(0, 49)]);
  }, []);

  const dispatchCommand = useCallback((command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'COMMAND', command }));
      pushLog('INFO', `Dispatched remote command: ${command}`);
    } else {
      pushLog('WARN', `Failed to dispatch command: WebSocket not connected.`);
    }
  }, [pushLog]);

  return { globalConnectivity, throughput, systemLogs, activeNodes, regionalActivity, activeThreats, pushLog, dispatchCommand };
}
