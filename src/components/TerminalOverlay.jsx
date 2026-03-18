import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X } from 'lucide-react';
import { audio } from '../services/audio';

export default function TerminalOverlay({ onClose, wsCommandDispatcher, pushLog }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    'OMNISIGHT TERMINAL v9.4.1',
    'Type "help" for available commands.',
    '----------------------------------'
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      const cmd = input.trim();
      setHistory(prev => [...prev, `> ${cmd}`]);
      setInput('');
      audio.click();

      const lowerCmd = cmd.toLowerCase();

      if (lowerCmd === 'help') {
        setHistory(prev => [...prev, 'Commands: ping <target>, scenario <name>, clear, exit']);
      } else if (lowerCmd === 'clear') {
        setHistory(['OMNISIGHT TERMINAL v9.4.1', 'Type "help" for available commands.', '----------------------------------']);
      } else if (lowerCmd === 'exit') {
        onClose();
      } else if (lowerCmd.startsWith('ping') || lowerCmd.startsWith('scenario')) {
        // Dispatch to backend
        if (wsCommandDispatcher) {
          wsCommandDispatcher(cmd);
          pushLog('INFO', `Dispatched command: ${cmd}`);
        } else {
          setHistory(prev => [...prev, 'Error: Telemetry stream disconnected.']);
        }
      } else {
        setHistory(prev => [...prev, `Command not found: ${cmd}`]);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-2xl h-[400px] glass-panel border border-primary/50 flex flex-col shadow-2xl overflow-hidden rounded-none crt-overlay">
        <div className="flex items-center justify-between px-4 py-2 bg-primary/20 border-b border-primary/30">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-primary neon-text-blue" />
            <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase">System Terminal</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400 bg-black/80 custom-scrollbar">
          {history.map((line, i) => (
            <div key={i} className="mb-1 opacity-90">{line}</div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="p-3 bg-black/90 border-t border-primary/20 flex items-center gap-2">
          <span className="text-green-500 font-mono text-sm font-bold">&gt;</span>
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleCommand}
            className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-sm placeholder-green-800"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
