import React, { useState } from 'react';
import { Brain, ChevronDown, Sparkles } from 'lucide-react';

interface ThinkingProcessProps {
  thinking: string;
  isStreaming?: boolean;
}

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thinking, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!thinking) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-purple-500/20 bg-purple-950/15 backdrop-blur-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs text-purple-300 transition-colors hover:bg-purple-900/20"
      >
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-purple-400" />
          <span className="font-semibold tracking-wide">
            {isStreaming ? 'Reasoning Chain in Progress...' : 'View Thought Process'}
          </span>
          {isStreaming && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-purple-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-purple-500/15 px-3.5 py-2.5 text-xs text-purple-200/80 font-mono leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap selection:bg-purple-500/30">
          {thinking}
          {isStreaming && <span className="streaming-cursor !bg-purple-400" />}
        </div>
      )}
    </div>
  );
};
