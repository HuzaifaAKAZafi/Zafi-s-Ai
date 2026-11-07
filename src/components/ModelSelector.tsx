import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Sparkles,
  Zap,
  Cpu,
  Brain,
  ShieldCheck,
  AlertCircle,
  Key,
  Check,
  ExternalLink,
  Code2,
  DollarSign,
  Gift,
  RotateCw,
} from 'lucide-react';
import { ProviderId, ModelInfo, ProviderConfigs, ServerProviderStatusResponse } from '../types/chat';
import { PROVIDERS, ALL_MODELS, getProvider, getModel } from '../data/providers';
import { isProviderReady } from '../utils/storage';

interface ModelSelectorProps {
  currentProvider: ProviderId;
  currentModel: string;
  onSelect: (providerId: ProviderId, modelId: string) => void;
  configs: ProviderConfigs;
  serverStatus: ServerProviderStatusResponse | null;
  onOpenSettings: (initialProvider?: ProviderId) => void;
  availableModels?: ModelInfo[];
  onRefreshModels?: () => Promise<void>;
  isRefreshingModels?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentProvider,
  currentModel,
  onSelect,
  configs,
  serverStatus,
  onOpenSettings,
  availableModels,
  onRefreshModels,
  isRefreshingModels = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'free' | ProviderId>('all');
  const [customModelInput, setCustomModelInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeProvider = getProvider(currentProvider);
  const activeModel = getModel(currentProvider, currentModel);
  const isCurrentReady = isProviderReady(currentProvider, configs, serverStatus);

  const modelsPool = availableModels && availableModels.length > 0 ? availableModels : ALL_MODELS;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter models
  const filteredModels = useMemo(() => {
    return modelsPool.filter((m) => {
      // Filter by provider or free tier
      if (selectedFilter === 'free' && !m.isFree) return false;
      if (selectedFilter !== 'all' && selectedFilter !== 'free' && m.providerId !== selectedFilter) {
        return false;
      }

      // Filter by search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const provider = getProvider(m.providerId);
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        provider.name.toLowerCase().includes(q) ||
        m.tierLabel.toLowerCase().includes(q)
      );
    });
  }, [modelsPool, selectedFilter, searchQuery]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-1.5 text-left backdrop-blur-xl transition-all duration-200 hover:border-cyan-500/40 hover:bg-neutral-850 focus:outline-none"
      >
        {/* Provider Color Dot */}
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: activeProvider.accentColor }}
        >
          {activeProvider.name.charAt(0)}
        </div>

        {/* Model Details */}
        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-slate-200">{activeModel.name}</span>
            {activeModel.isFree ? (
              <span className="rounded bg-emerald-500/15 px-1 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/30">
                FREE
              </span>
            ) : (
              <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-semibold text-amber-400 border border-amber-500/30">
                PAID
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">
            {activeProvider.name} {!isCurrentReady && '• Key Required'}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="glass-dropdown absolute left-0 top-full z-50 mt-2 w-[340px] sm:w-[480px] rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Search */}
          <div className="border-b border-white/10 p-3 bg-neutral-950/70">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 25+ models by name, provider, tier..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:bg-white/[0.07] focus:outline-none"
                />
              </div>

              {/* Refresh Models Button */}
              {onRefreshModels && (
                <button
                  type="button"
                  onClick={() => onRefreshModels()}
                  disabled={isRefreshingModels}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-500/40 hover:bg-white/10 hover:text-cyan-400 transition-colors disabled:opacity-50"
                  title="Refresh live models from configured provider APIs"
                >
                  <RotateCw
                    className={`h-4 w-4 ${isRefreshingModels ? 'animate-spin text-cyan-400' : ''}`}
                  />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="mt-2.5 flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-cyan-500 text-black font-semibold'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                All Models
              </button>
              <button
                onClick={() => setSelectedFilter('free')}
                className={`flex shrink-0 items-center space-x-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  selectedFilter === 'free'
                    ? 'bg-emerald-500 text-black font-semibold'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                <Gift className="h-3 w-3" />
                <span>Free Tier Only</span>
              </button>
              {PROVIDERS.map((p) => {
                const ready = isProviderReady(p.id, configs, serverStatus);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedFilter(p.id)}
                    className={`flex shrink-0 items-center space-x-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                      selectedFilter === p.id
                        ? 'bg-white/20 text-white font-semibold'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: p.accentColor }}
                    />
                    <span>{p.name.replace('Google ', '').replace(' Workers AI', '')}</span>
                    {ready ? (
                      <span className="text-[9px] text-emerald-400 font-bold">✓</span>
                    ) : (
                      <span className="text-[9px] text-slate-500">○</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Model ID Entry (Shown if custom filter is active or searching) */}
          {(selectedFilter === 'custom' || currentProvider === 'custom') && (
            <div className="border-b border-white/10 bg-pink-950/20 p-2.5 flex items-center space-x-2 text-xs">
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="Enter custom model ID (e.g. llama3.2:3b)"
                className="flex-1 rounded-lg border border-pink-500/30 bg-black/40 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (customModelInput.trim()) {
                    onSelect('custom', customModelInput.trim());
                    setIsOpen(false);
                  }
                }}
                disabled={!customModelInput.trim()}
                className="rounded-lg bg-pink-500 px-3 py-1 font-bold text-white hover:bg-pink-400 transition-colors disabled:opacity-40"
              >
                Use
              </button>
            </div>
          )}

          {/* Model List */}
          <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
            {filteredModels.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No AI models found matching "{searchQuery}"
              </div>
            ) : (
              filteredModels.map((m) => {
                const provider = getProvider(m.providerId);
                const isSelected = m.providerId === currentProvider && m.id === currentModel;
                const ready = isProviderReady(m.providerId, configs, serverStatus);

                return (
                  <button
                    key={`${m.providerId}-${m.id}`}
                    onClick={() => {
                      onSelect(m.providerId, m.id);
                      setIsOpen(false);
                    }}
                    className={`group flex w-full items-start justify-between rounded-xl p-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-500/30'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      {/* Provider Badge icon */}
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: provider.accentColor }}
                      >
                        {provider.name.charAt(0)}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {m.name}
                          </span>
                          {/* Free or Paid Badge */}
                          {m.isFree ? (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                              {m.tierLabel}
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/30">
                              {m.tierLabel}
                            </span>
                          )}
                          {m.isDynamic && (
                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300 border border-cyan-500/30">
                              LIVE
                            </span>
                          )}
                          {m.supportsThinking && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 border border-purple-500/30">
                              Reasoning / CoT
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                          {m.description}
                        </p>

                        <div className="mt-1 flex items-center space-x-2 text-[10px] text-slate-500">
                          <span>{provider.name}</span>
                          {m.contextWindow && (
                            <>
                              <span>•</span>
                              <span>Context: {m.contextWindow}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className={m.isFree ? 'text-emerald-400/90 font-medium' : 'text-slate-400'}>
                            {m.tierDetails}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                      {!ready && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSettings(m.providerId);
                            setIsOpen(false);
                          }}
                          className="flex items-center space-x-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                          title="Click to set up API Key"
                        >
                          <Key className="h-3 w-3" />
                          <span>Setup</span>
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-cyan-400" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 bg-neutral-950/80 px-3 py-2 text-[11px]">
            <span className="text-slate-400">
              Default: <strong className="text-cyan-400">Google Gemini (Active)</strong>
            </span>
            <button
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
              className="flex items-center space-x-1 font-semibold text-cyan-400 hover:text-cyan-300"
            >
              <Key className="h-3 w-3" />
              <span>Manage Provider Keys</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
