import React from 'react';
import {
  X,
  BarChart3,
  Zap,
  RotateCcw,
  ShieldCheck,
  Cpu,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProviderId, UsageStats } from '../types/chat';
import { PROVIDERS, getProvider } from '../data/providers';

interface UsageDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageStats: UsageStats;
  onResetStats: () => void;
}

export const UsageDashboardModal: React.FC<UsageDashboardModalProps> = ({
  isOpen,
  onClose,
  usageStats,
  onResetStats,
}) => {
  if (!isOpen) return null;

  // Aggregate totals
  let grandTotalTokens = 0;
  let grandPromptTokens = 0;
  let grandCompletionTokens = 0;
  let grandRequests = 0;
  let grandCostUsd = 0;

  (Object.keys(usageStats) as ProviderId[]).forEach((pId) => {
    const s = usageStats[pId];
    if (s) {
      grandTotalTokens += s.totalTokens || 0;
      grandPromptTokens += s.promptTokens || 0;
      grandCompletionTokens += s.completionTokens || 0;
      grandRequests += s.requestCount || 0;
      grandCostUsd += s.estimatedCostUsd || 0;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl overflow-hidden border border-white/10 bg-neutral-950/90 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personal API Usage Dashboard</h2>
              <p className="text-xs text-slate-400">
                Track personal token consumption, API requests, and provider breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/40">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left">
              <div className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                <span>Total Tokens</span>
              </div>
              <div className="mt-1 text-lg font-extrabold text-white font-mono">
                {grandTotalTokens.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {grandPromptTokens.toLocaleString()} in / {grandCompletionTokens.toLocaleString()} out
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left">
              <div className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Total Requests</span>
              </div>
              <div className="mt-1 text-lg font-extrabold text-white font-mono">
                {grandRequests}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {grandRequests === 1 ? '1 session call' : `${grandRequests} session calls`}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left">
              <div className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                <span>Est. Total Cost</span>
              </div>
              <div className="mt-1 text-lg font-extrabold text-emerald-400 font-mono">
                ${grandCostUsd.toFixed(4)}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Gemini & Groq Free Tier
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left">
              <div className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Privacy Mode</span>
              </div>
              <div className="mt-1 text-xs font-extrabold text-purple-300 uppercase tracking-wide">
                Personal Single-User
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                No public signup
              </div>
            </div>
          </div>

          {/* Provider Breakdown Table */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden">
            <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Usage Breakdown by Provider
              </h3>
              <span className="text-[11px] text-slate-500">Updated in real-time</span>
            </div>

            <div className="divide-y divide-white/5">
              {PROVIDERS.map((p) => {
                const s = usageStats[p.id] || {
                  promptTokens: 0,
                  completionTokens: 0,
                  totalTokens: 0,
                  estimatedCostUsd: 0,
                  requestCount: 0,
                };

                return (
                  <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center space-x-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: p.accentColor }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{p.name}</span>
                          {p.id === 'gemini' || p.id === 'groq' ? (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                              FREE DEV TIER
                            </span>
                          ) : p.id === 'deepseek' ? (
                            <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 border border-cyan-500/30">
                              LOW-COST PAID
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{p.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-xs text-right self-end sm:self-auto">
                      <div>
                        <div className="font-mono font-bold text-slate-200">
                          {s.totalTokens.toLocaleString()} <span className="text-[10px] text-slate-500 font-sans">tokens</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {s.promptTokens.toLocaleString()} in / {s.completionTokens.toLocaleString()} out
                        </div>
                      </div>

                      <div className="w-20">
                        <div className="font-mono font-bold text-emerald-400">
                          ${(s.estimatedCostUsd || 0).toFixed(4)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {s.requestCount} requests
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Direct Server Note */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-xs text-slate-400 flex items-start space-x-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Personal Single-User Architecture:</strong> This applet is configured specifically for your personal workflow. No user accounts or signup flows exist. API calls route through your server-side environment secrets (<code className="text-cyan-300 font-mono">GEMINI_API_KEY</code>, <code className="text-cyan-300 font-mono">GROQ_API_KEY</code>, <code className="text-cyan-300 font-mono">DEEPSEEK_API_KEY</code>).
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-neutral-950/80 px-6 py-3">
          <button
            type="button"
            onClick={onResetStats}
            className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Local Stats</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-1.5 text-xs font-bold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
