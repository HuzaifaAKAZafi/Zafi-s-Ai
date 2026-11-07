import React from 'react';
import { X, Server, Globe, Key, ShieldCheck, CheckCircle2, Cpu } from 'lucide-react';
import { ProviderId, ProviderConfigs, ServerProviderStatusResponse } from '../types/chat';
import { getProvider, getModel } from '../data/providers';
import { isProviderReady } from '../utils/storage';

interface ModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvider: ProviderId;
  currentModel: string;
  configs: ProviderConfigs;
  serverStatus: ServerProviderStatusResponse | null;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({
  isOpen,
  onClose,
  currentProvider,
  currentModel,
  configs,
  serverStatus,
}) => {
  if (!isOpen) return null;

  const provider = getProvider(currentProvider);
  const model = getModel(currentProvider, currentModel);
  const ready = isProviderReady(currentProvider, configs, serverStatus);

  const serverProviderInfo = serverStatus?.providers?.find((p) => p.id === currentProvider);
  const endpoint = serverProviderInfo?.endpoint || 'https://api.openai.com/v1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel-elevated w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
              style={{ backgroundColor: provider.accentColor }}
            >
              {provider.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Active Model & Provider Metadata</h3>
              <p className="text-xs text-slate-400">Exact backend runtime configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata Details */}
        <div className="mt-5 space-y-3.5 text-xs">
          {/* Provider */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Provider Engine</span>
            <span className="font-bold text-white flex items-center space-x-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: provider.accentColor }}
              />
              <span>{provider.name}</span>
            </span>
          </div>

          {/* Exact Model ID */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Exact Model ID</span>
            <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
              {model.id}
            </span>
          </div>

          {/* API Endpoint */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Target API Endpoint</span>
            <span className="font-mono text-slate-300 text-[11px] truncate max-w-[260px]" title={endpoint}>
              {endpoint}
            </span>
          </div>

          {/* Connection Status */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Connection Status</span>
            {ready ? (
              <span className="flex items-center space-x-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-400 font-semibold border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected & Ready</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1 text-amber-400 font-semibold border border-amber-500/30">
                <Key className="h-3.5 w-3.5" />
                <span>API Key Required</span>
              </span>
            )}
          </div>

          {/* Context Window & Tier */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Context Window & Tier</span>
            <span className="text-slate-200 font-medium">
              {model.contextWindow} • <strong className="text-cyan-300">{model.tierLabel}</strong>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
