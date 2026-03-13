import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import IntelligenceHub from './components/IntelligenceHub';
import SystemLogs from './components/SystemLogs';
import NodeDetailPanel from './components/NodeDetailPanel';
import { useMockData } from './hooks/useMockData';
import { Server, Search, X, MapPin } from 'lucide-react';
import { geocodeSearch } from './services/maptoolkit';

export default function App() {
  const { globalConnectivity, throughput, systemLogs, activeNodes, regionalActivity, pushLog } = useMockData();
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocodeSuggestions, setGeocodeSuggestions] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const flyToRef = useRef(null);
  const geocodeDebounce = useRef(null);

  const handleSelectNode = useCallback((node) => {
    setSelectedNode(node);
    setGeocodeSuggestions([]);
    setSearchQuery('');
  }, []);

  const handleDiagnostic = useCallback((node) => {
    pushLog('ALERT', `Diagnostic initiated on ${node.id} (${node.ip}) — ${node.region}`);
    pushLog('INFO', `Geo-ping sequence started for ${node.name}`);
  }, [pushLog]);

  const hubData = { globalConnectivity, throughput, regionalActivity };

  // ── Find nearest node (same region prefix) for FastRoute ──────────────
  const nearestNode = useMemo(() => {
    if (!selectedNode) return null;
    const regionPrefix = selectedNode.region.split('-')[0]; // e.g. "EU" from "EU-West"
    const candidates = activeNodes.filter(n =>
      n.id !== selectedNode.id && n.region.startsWith(regionPrefix)
    );
    if (!candidates.length) {
      // Fallback: absolute nearest node regardless of region
      return activeNodes
        .filter(n => n.id !== selectedNode.id)
        .sort((a, b) => {
          const da = (a.lat - selectedNode.lat) ** 2 + (a.lng - selectedNode.lng) ** 2;
          const db = (b.lat - selectedNode.lat) ** 2 + (b.lng - selectedNode.lng) ** 2;
          return da - db;
        })[0] || null;
    }
    return candidates.sort((a, b) => {
      const da = (a.lat - selectedNode.lat) ** 2 + (a.lng - selectedNode.lng) ** 2;
      const db = (b.lat - selectedNode.lat) ** 2 + (b.lng - selectedNode.lng) ** 2;
      return db - da; // placeholder for diff
    })[0];
  }, [selectedNode, activeNodes]);

  // ── Node filtering ──────────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return activeNodes;
    const lower = searchQuery.toLowerCase();
    return activeNodes.filter(n =>
      n.id.toLowerCase().includes(lower) ||
      n.name.toLowerCase().includes(lower) ||
      n.ip.includes(lower) ||
      n.region.toLowerCase().includes(lower)
    );
  }, [activeNodes, searchQuery]);

  // ── Live geocode suggestions ────────────────────────────────────────────
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    if (geocodeDebounce.current) clearTimeout(geocodeDebounce.current);

    // Only geocode if no nodes matched and query is long enough
    if (value.length >= 3) {
      geocodeDebounce.current = setTimeout(async () => {
        try {
          const results = await geocodeSearch(value, { limit: 4 });
          setGeocodeSuggestions(results.slice(0, 4));
        } catch {
          setGeocodeSuggestions([]);
        }
      }, 380);
    } else {
      setGeocodeSuggestions([]);
    }
  }, []);

  const handleGeoSuggestion = useCallback((suggestion) => {
    setGeocodeSuggestions([]);
    setSearchQuery('');
    if (flyToRef.current) {
      flyToRef.current(parseFloat(suggestion.lat), parseFloat(suggestion.lon), 1.5);
    }
    pushLog('INFO', `Globe navigated to: ${suggestion.display_name.split(',').slice(0, 2).join(',')}`);
  }, [pushLog]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setGeocodeSuggestions([]);
  }, []);

  // Close geocode dropdown on outside click
  useEffect(() => {
    const handler = () => setGeocodeSuggestions([]);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="relative flex h-screen w-full bg-background-dark font-display text-slate-100 overflow-hidden">

      {/* ── Full-screen globe/map ── */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <MapView
          nodes={filteredNodes}
          onSelectNode={handleSelectNode}
          selectedNodeId={selectedNode?.id}
          flyToRef={flyToRef}
        />
      </div>

      {/* ── Header bar ── */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center gap-4 bg-background-dark/85 backdrop-blur-md px-5 py-3.5 border-b border-primary/20 pointer-events-auto shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        {/* Logo */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 glass-card">
          <span className="material-symbols-outlined text-primary text-xl neon-text-blue">grid_view</span>
        </div>

        {/* Title */}
        <div className="hidden lg:block">
          <div className="text-[11px] font-bold tracking-[0.2em] text-primary/70 uppercase">Geospatial</div>
          <div className="text-sm font-bold text-white tracking-widest uppercase leading-none">Command Node</div>
        </div>

        {/* Search bar — full featured */}
        <div className="flex-1 max-w-md mx-auto relative" onClick={e => e.stopPropagation()}>
          <div className={`flex w-full items-center rounded-xl overflow-hidden glass-card border transition-all ${searchFocused || searchQuery ? 'border-primary/70 shadow-[0_0_15px_rgba(37,71,244,0.25)]' : 'border-primary/25'}`}>
            <Search size={14} className="ml-4 text-primary/60 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              className="flex-1 border-none bg-transparent text-white focus:outline-none focus:ring-0 placeholder:text-white/30 text-sm font-medium h-10 px-3"
              placeholder="Search nodes, IPs, or fly to any location…"
            />
            {searchQuery && (
              <button aria-label="Clear search" onClick={clearSearch} className="mr-3 text-white/30 hover:text-white cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Geocode suggestions dropdown */}
          {geocodeSuggestions.length > 0 && searchFocused === false || geocodeSuggestions.length > 0 ? (
            <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-xl overflow-hidden z-[9999] border border-white/10 shadow-2xl">
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">📍 MapToolkit — Jump to location</span>
              </div>
              {geocodeSuggestions.map(s => (
                <button
                  key={s.place_id}
                  onClick={() => handleGeoSuggestion(s)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/05 text-left transition-colors cursor-pointer border-b border-white/[0.04] last:border-none"
                >
                  <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-white/85 leading-tight">
                      {s.display_name.split(',').slice(0, 2).join(',')}
                    </div>
                    <div className="text-[10px] text-white/35 mt-0.5">
                      {s.display_name.split(',').slice(2).join(',').trim()}
                    </div>
                  </div>
                  <div className="ml-auto text-[9px] font-mono text-white/25">
                    {parseFloat(s.lat).toFixed(2)}, {parseFloat(s.lon).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedNode && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 glass-card rounded-xl border border-cyan-500/30 text-xs text-cyan-300 font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {selectedNode.id}
            </div>
          )}
          <button
            aria-label="Clear selected node"
            className="relative flex size-10 items-center justify-center rounded-xl glass-card text-primary border border-primary/35 hover:bg-primary/20 transition-colors cursor-pointer"
            onClick={() => setSelectedNode(null)}
            title="Clear selected node"
          >
            <Server size={17} />
            <span className="absolute top-2 right-2 flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f0ff]" />
          </button>
        </div>
      </header>

      {/* ── Content overlay ── */}
      <div className="absolute inset-x-0 z-10 flex gap-5 overflow-hidden pointer-events-none"
        style={{ top: 65, bottom: 0, padding: '16px' }}>

        {/* ── LEFT: Intelligence Hub ── */}
        <div className="w-[360px] shrink-0 pointer-events-auto h-full overflow-hidden">
          <IntelligenceHub data={hubData} />
        </div>

        {/* ── CENTER: globe fills it ── */}
        <div className="flex-1 pointer-events-none" />

        {/* ── RIGHT: Node Detail + System Logs ── */}
        <div className="w-[360px] shrink-0 pointer-events-auto flex flex-col gap-4 h-full overflow-hidden">
          {selectedNode && (
            <div className="flex-shrink-0">
              <NodeDetailPanel
                node={selectedNode}
                nearestNode={nearestNode}
                onClose={() => setSelectedNode(null)}
                onDiagnostic={handleDiagnostic}
                pushLog={pushLog}
              />
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SystemLogs logs={systemLogs} />
          </div>
        </div>

      </div>
    </div>
  );
}
