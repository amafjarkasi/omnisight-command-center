import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { audio } from '../services/audio';

export default function TerminalOverlay({ isOpen, onClose, sendCommand, cmdResponse, pushLog }) {
  const [history, setHistory] = useState([
    { type: 'system', text: 'OmniSight Core OS v4.2.1 initialized.' },
    { type: 'system', text: 'Type "help" for a list of available commands.' }
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  useEffect(() => {
    if (cmdResponse && cmdResponse.original) {
      const { payload, original } = cmdResponse;

      if (original === 'clear') {
         // eslint-disable-next-line react-hooks/set-state-in-effect
         setHistory([]);
         return;
      }


      setHistory(prev => [
        ...prev,
        { type: 'output', text: payload.text, success: payload.success }
      ]);

      if (payload.success && original.startsWith('scenario')) {
         pushLog('ALERT', payload.text);
         audio.playAlert();
      }
    }
  }, [cmdResponse, pushLog]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    audio.playClick();
    const cmd = input.trim();
    setHistory(prev => [...prev, { type: 'input', text: `> ${cmd}` }]);
    sendCommand(cmd);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
        audio.playTyping();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[800px] max-w-[90vw] z-[9000] glass-panel border border-cyan-500/50 shadow-2xl flex flex-col" style={{ height: '400px', backgroundColor: 'rgba(2, 5, 20, 0.95)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/30">
        <div className="flex items-center gap-2 text-cyan-400">
          <TerminalSquare size={16} />
          <span className="text-xs font-bold tracking-widest uppercase">Root Terminal Access</span>
        </div>
        <button onClick={onClose} className="text-cyan-500 hover:text-cyan-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-sm font-mono space-y-2">
        {history.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed ${
            line.type === 'system' ? 'text-cyan-600' :
            line.type === 'input' ? 'text-white font-bold' :
            line.success === false ? 'text-red-400' : 'text-cyan-300/80'
          }`}>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-cyan-500/30 p-2 flex items-center bg-black/40">
        <span className="text-cyan-500 font-bold mr-2 ml-2">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-cyan-300 font-mono text-sm placeholder:text-cyan-800"
          placeholder="Enter command..."
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
}

TerminalOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sendCommand: PropTypes.func.isRequired,
  cmdResponse: PropTypes.object,
  pushLog: PropTypes.func.isRequired,
};
