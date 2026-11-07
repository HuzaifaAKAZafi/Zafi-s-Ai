import React, { useState } from 'react';
import { X, Sparkles, Sliders, Check } from 'lucide-react';

interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  onSavePrompt: (prompt: string) => void;
}

const PRESETS = [
  {
    label: 'Code Architect',
    prompt: 'You are a Senior Principal Software Engineer. Write clean, modular, production-ready TypeScript code with clear type definitions, error handling, and modern architectural patterns.',
  },
  {
    label: 'Concise & Direct',
    prompt: 'Provide concise, direct, high-signal answers. Avoid fluff, unnecessary disclaimers, or excessive conversational filler. Get straight to the answer with bullet points and code where applicable.',
  },
  {
    label: 'Deep Analytical',
    prompt: 'Analyze every query rigorously from first principles. Break down trade-offs, edge cases, performance implications, and provide structured reasoning.',
  },
  {
    label: 'Creative & Engaging',
    prompt: 'You are a witty, creative, and engaging writer. Craft compelling prose with rich vocabulary, vivid analogies, and vibrant storytelling.',
  },
];

export const SystemPromptModal: React.FC<SystemPromptModalProps> = ({
  isOpen,
  onClose,
  systemPrompt,
  onSavePrompt,
}) => {
  const [prompt, setPrompt] = useState(systemPrompt);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePrompt(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel-elevated w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Instructions</h3>
              <p className="text-xs text-slate-400">Custom persona or behavior for the active chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Persona Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPrompt(p.prompt)}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left text-xs hover:border-cyan-500/40 hover:bg-white/[0.06] transition-all"
              >
                <div className="font-semibold text-slate-200">{p.label}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.prompt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Textarea */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">Prompt Instructions</label>
            {prompt && (
              <button
                onClick={() => setPrompt('')}
                className="text-[11px] text-rose-400 hover:text-rose-300"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. You are an expert AI tutor. Explain complex concepts in simple terms..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:bg-white/[0.07] resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="mt-5 flex items-center justify-end space-x-2.5">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>Apply Instructions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
