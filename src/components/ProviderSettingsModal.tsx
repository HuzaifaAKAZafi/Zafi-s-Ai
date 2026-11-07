import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Check,
  Server,
  Zap,
  Globe,
  Plus,
  Edit2,
  Power,
  Star,
  RotateCw,
  Cpu,
} from 'lucide-react';
import { ProviderId, ProviderConfigs, ServerProviderStatusResponse } from '../types/chat';
import { PROVIDERS, getProvider } from '../data/providers';
import { isProviderReady } from '../utils/storage';

interface SavedKeyProfileFrontend {
  id: string;
  provider: ProviderId;
  label: string;
  maskedApiKey: string;
  hasApiKey: boolean;
  baseUrl?: string;
  defaultModel?: string;
  enabled: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  lastTestStatus?: any;
}

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: ProviderConfigs;
  onSaveConfigs: (newConfigs: ProviderConfigs) => void;
  serverStatus: ServerProviderStatusResponse | null;
  initialProvider?: ProviderId;
}

const ENV_VAR_MAP: Record<ProviderId, { envVar: string; endpoint: string }> = {
  gemini: {
    envVar: 'GEMINI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  },
  groq: {
    envVar: 'GROQ_API_KEY',
    endpoint: 'https://api.groq.com/openai/v1',
  },
  deepseek: {
    envVar: 'DEEPSEEK_API_KEY',
    endpoint: 'https://api.deepseek.com',
  },
  custom: {
    envVar: 'CUSTOM_ENDPOINT',
    endpoint: 'User Configured',
  },
};

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  configs,
  onSaveConfigs,
  serverStatus,
  initialProvider = 'gemini',
}) => {
  const [activeTab, setActiveTab] = useState<'manager' | 'status'>('manager');
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(initialProvider);
  const [localConfigs, setLocalConfigs] = useState<ProviderConfigs>(configs);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Server Saved Keys State
  const [savedKeys, setSavedKeys] = useState<SavedKeyProfileFrontend[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  // Add / Edit Key Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [formProvider, setFormProvider] = useState<ProviderId>('groq');
  const [formLabel, setFormLabel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formDefaultModel, setFormDefaultModel] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [showFormKey, setShowFormKey] = useState(false);

  // Single test status
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    latencyMs?: number;
    modelCount?: number;
  }>({ loading: false });

  // Key specific testing state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const fetchSavedKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (data?.keys && Array.isArray(data.keys)) {
        setSavedKeys(data.keys);
      }
    } catch (err) {
      console.warn('Failed to fetch saved keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSavedKeys();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProvider = getProvider(selectedProviderId);
  const currentConfig = localConfigs[selectedProviderId] || { apiKey: '', temperature: 0.7 };
  const ready = isProviderReady(selectedProviderId, localConfigs, serverStatus);

  const serverProviderInfo = serverStatus?.providers?.find((p) => p.id === selectedProviderId);
  const isServerConfigured = serverProviderInfo?.configured ?? false;

  const envInfo = ENV_VAR_MAP[selectedProviderId] || ENV_VAR_MAP['custom'];

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdate = (field: string, value: any) => {
    setLocalConfigs((prev) => ({
      ...prev,
      [selectedProviderId]: {
        ...prev[selectedProviderId],
        [field]: value,
      },
    }));
    setTestStatus({ loading: false });
  };

  const handleOpenAddForm = (prov: ProviderId = 'groq') => {
    setEditingKeyId(null);
    setFormProvider(prov);
    setFormLabel('');
    setFormApiKey('');
    setFormBaseUrl(prov === 'custom' ? 'https://api.together.xyz/v1' : '');
    setFormDefaultModel('');
    setFormIsDefault(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (k: SavedKeyProfileFrontend) => {
    setEditingKeyId(k.id);
    setFormProvider(k.provider);
    setFormLabel(k.label);
    setFormApiKey(''); // Leave blank unless changing
    setFormBaseUrl(k.baseUrl || '');
    setFormDefaultModel(k.defaultModel || '');
    setFormIsDefault(k.isDefault);
    setIsFormOpen(true);
  };

  const handleSaveKeyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProvider || (!formApiKey && !editingKeyId)) return;

    try {
      if (editingKeyId) {
        await fetch(`/api/keys/${editingKeyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: formLabel,
            apiKey: formApiKey || undefined,
            baseUrl: formBaseUrl || undefined,
            defaultModel: formDefaultModel || undefined,
            isDefault: formIsDefault,
          }),
        });
      } else {
        await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: formProvider,
            label: formLabel || `${formProvider.toUpperCase()} Key`,
            apiKey: formApiKey,
            baseUrl: formBaseUrl || undefined,
            defaultModel: formDefaultModel || undefined,
            isDefault: formIsDefault,
          }),
        });
      }

      setIsFormOpen(false);
      fetchSavedKeys();
    } catch (err) {
      console.error('Failed to save key profile:', err);
    }
  };

  const handleDeleteKeyProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved key profile from server storage?')) return;
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      fetchSavedKeys();
    } catch (err) {
      console.error('Failed to delete key profile:', err);
    }
  };

  const handleToggleKeyProfile = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}/toggle`, { method: 'POST' });
      fetchSavedKeys();
    } catch (err) {
      console.error('Failed to toggle key profile:', err);
    }
  };

  const handleSetDefaultKeyProfile = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}/default`, { method: 'POST' });
      fetchSavedKeys();
    } catch (err) {
      console.error('Failed to set default key profile:', err);
    }
  };

  const handleTestKeyProfile = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await fetch(`/api/keys/${id}/test`, { method: 'POST' });
      const data = await res.json();
      fetchSavedKeys();
    } catch (err) {
      console.error('Failed to test key profile:', err);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: undefined });
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProviderId,
          apiKey: currentConfig.apiKey || undefined,
          customEndpoint: currentConfig.customEndpoint || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus({
          loading: false,
          success: true,
          message: data.message || 'Connected successfully!',
          latencyMs: data.latencyMs,
          modelCount: data.modelCount,
        });
      } else if (data?.code === 'INSUFFICIENT_CREDITS' || res.status === 402) {
        setTestStatus({
          loading: false,
          success: true,
          message: 'Authenticated – Credits Required (Key verified on provider API, balance top-up needed at platform.deepseek.com)',
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: data.message || 'Connection test failed.',
        });
      }
    } catch (err: any) {
      setTestStatus({ loading: false, success: false, message: err.message || 'Network error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel-elevated relative flex h-[92vh] max-h-[780px] w-full max-w-4xl flex-col rounded-3xl overflow-hidden border border-white/10 bg-neutral-950/90 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">API Key Manager & Provider Hub</h2>
              <p className="text-xs text-slate-400">
                Secure server-side API key management, custom providers, and live connection testing
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab Navigation */}
            <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('manager')}
                className={`rounded-lg px-3 py-1 transition-all ${
                  activeTab === 'manager'
                    ? 'bg-cyan-500 text-black font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Key Manager ({savedKeys.length})
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`rounded-lg px-3 py-1 transition-all ${
                  activeTab === 'status'
                    ? 'bg-cyan-500 text-black font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Environment Keys
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: API Key Manager (Server-Side Storage) */}
        {activeTab === 'manager' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/40">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Server-Side Saved Keys & Custom Providers</span>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300 font-bold border border-purple-500/30">
                    MASKED ON FRONTEND
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Keys are stored exclusively in server memory/file storage. Never exposed in browser storage or JS bundles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddForm('groq')}
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Key / Custom Provider</span>
              </button>
            </div>

            {/* Saved Key List */}
            {isLoadingKeys ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                <RotateCw className="h-4 w-4 animate-spin text-cyan-400" />
                <span>Loading saved server keys...</span>
              </div>
            ) : savedKeys.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
                <Server className="h-8 w-8 text-slate-500 mx-auto" />
                <div className="text-xs font-bold text-slate-300">No Custom API Keys Saved Yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your built-in AI Studio environment keys (<code className="text-cyan-300 font-mono">GEMINI_API_KEY</code>, <code className="text-cyan-300 font-mono">GROQ_API_KEY</code>, <code className="text-cyan-300 font-mono">DEEPSEEK_API_KEY</code>) are active. You can add additional custom keys or custom OpenAI-compatible endpoints here.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddForm('custom')}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                >
                  Add Custom Provider Key
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedKeys.map((k) => {
                  const providerInfo = getProvider(k.provider);
                  const isTesting = testingKeyId === k.id;
                  const testRes = k.lastTestStatus;

                  return (
                    <div
                      key={k.id}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                        k.enabled
                          ? 'border-white/10 bg-neutral-900/60 hover:border-cyan-500/30'
                          : 'border-white/5 bg-neutral-950/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm mt-0.5"
                          style={{ backgroundColor: providerInfo.accentColor }}
                        >
                          {providerInfo.name.charAt(0)}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{k.label}</span>
                            {k.isDefault && (
                              <span className="flex items-center space-x-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span>DEFAULT</span>
                              </span>
                            )}
                            {!k.enabled && (
                              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                DISABLED
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <code className="font-mono text-cyan-300 bg-black/50 px-2 py-0.5 rounded text-[11px] border border-cyan-500/20">
                              {k.maskedApiKey || 'Server Secret'}
                            </code>
                            <span className="text-slate-500 text-[11px]">Provider: {providerInfo.name}</span>
                            {k.baseUrl && (
                              <span className="text-slate-400 text-[10px] font-mono truncate max-w-[200px]" title={k.baseUrl}>
                                Base: {k.baseUrl}
                              </span>
                            )}
                            {k.defaultModel && (
                              <span className="text-slate-400 text-[10px] font-mono">
                                Model: {k.defaultModel}
                              </span>
                            )}
                          </div>

                          {/* Last test status badge */}
                          {testRes && (
                            <div className="mt-2 text-[10px] flex items-center space-x-2">
                              {testRes.ok ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Connected ({testRes.latencyMs}ms)</span>
                                </span>
                              ) : (
                                <span className="text-amber-400 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{testRes.message || 'Test failed'}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                        {/* Test Button */}
                        <button
                          type="button"
                          onClick={() => handleTestKeyProfile(k.id)}
                          disabled={isTesting || !k.enabled}
                          className="flex items-center space-x-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-40 transition-colors"
                          title="Test Connection"
                        >
                          <Zap className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                          <span>{isTesting ? 'Testing...' : 'Test'}</span>
                        </button>

                        {/* Toggle Enable/Disable */}
                        <button
                          type="button"
                          onClick={() => handleToggleKeyProfile(k.id)}
                          className={`rounded-xl p-2 transition-colors ${
                            k.enabled
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-500 hover:bg-white/10'
                          }`}
                          title={k.enabled ? 'Disable Key' : 'Enable Key'}
                        >
                          <Power className="h-4 w-4" />
                        </button>

                        {/* Set Default */}
                        {!k.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultKeyProfile(k.id)}
                            className="rounded-xl p-2 text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors"
                            title="Set as Default Key for Provider"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(k)}
                          className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Edit Key"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteKeyProfile(k.id)}
                          className="rounded-xl p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title="Delete Key Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add / Edit Form Modal Drawer */}
            {isFormOpen && (
              <div className="rounded-2xl border border-cyan-500/30 bg-neutral-900/95 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                    <Key className="h-4 w-4 text-cyan-400" />
                    <span>{editingKeyId ? 'Edit Server Key Profile' : 'Add New Server Key Profile'}</span>
                  </h4>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSaveKeyProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Provider Select */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Provider Type</label>
                      <select
                        value={formProvider}
                        onChange={(e) => setFormProvider(e.target.value as ProviderId)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="groq">Groq</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="custom">Custom OpenAI-Compatible Provider</option>
                      </select>
                    </div>

                    {/* Label */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Key Label / Name</label>
                      <input
                        type="text"
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        placeholder="e.g. Primary Groq Key, Together AI, DeepInfra"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                  </div>

                  {/* API Key Input */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      API Key {editingKeyId && '(Leave empty to keep existing key)'}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showFormKey ? 'text' : 'password'}
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder={editingKeyId ? '••••••••••••••••' : 'Enter secret API key'}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 pr-10 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        required={!editingKeyId}
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormKey(!showFormKey)}
                        className="absolute right-2.5 text-slate-400 hover:text-white"
                      >
                        {showFormKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Custom Base URL & Default Model */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Base Endpoint URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={formBaseUrl}
                        onChange={(e) => setFormBaseUrl(e.target.value)}
                        placeholder="e.g. https://api.together.xyz/v1"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Default Model ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={formDefaultModel}
                        onChange={(e) => setFormDefaultModel(e.target.value)}
                        placeholder="e.g. meta-llama/Llama-3.3-70B-Instruct-Turbo"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Set as Default Checkbox */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="formIsDefault"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="rounded accent-cyan-400"
                    />
                    <label htmlFor="formIsDefault" className="text-slate-300 cursor-pointer">
                      Set as default key profile for {formProvider.toUpperCase()}
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end space-x-2.5 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-cyan-500 px-5 py-2 font-bold text-black hover:bg-cyan-400 shadow-md transition-colors"
                    >
                      {editingKeyId ? 'Update Key' : 'Save Key Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Server Storage Security Banner */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-xs text-slate-400 flex items-start space-x-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Server Storage Security Protocol:</strong> All saved keys are stored securely on the backend server (<code className="text-cyan-300 font-mono">.data/server-keys.json</code>). Frontend API responses return masked strings (<code className="text-cyan-300 font-mono">••••••••</code>) for display only.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Environment Variables & Provider Testing */}
        {activeTab === 'status' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/40">
            {/* Provider Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start space-x-3.5">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
                  style={{ backgroundColor: currentProvider.accentColor }}
                >
                  {currentProvider.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{currentProvider.name}</h3>
                    {isServerConfigured && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        ACTIVE VIA SERVER ENV
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{currentProvider.description}</p>
                </div>
              </div>

              {currentProvider.apiKeyUrl && (
                <a
                  href={currentProvider.apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 shrink-0 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors self-start sm:self-auto"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Official Endpoint Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center space-x-2 text-slate-400 mb-1 font-mono text-[11px]">
                  <Server className="h-3.5 w-3.5 text-cyan-400" />
                  <span>AI Studio Environment Secret</span>
                </div>
                <div className="font-mono font-bold text-slate-200 text-xs">
                  {envInfo.envVar}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center space-x-2 text-slate-400 mb-1 font-mono text-[11px]">
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Target API Endpoint</span>
                </div>
                <div className="font-mono text-slate-300 text-[11px] truncate" title={envInfo.endpoint}>
                  {envInfo.endpoint}
                </div>
              </div>
            </div>

            {/* Test Status Banner */}
            {testStatus.message && (
              <div
                className={`rounded-xl p-3 text-xs flex items-start space-x-2.5 ${
                  testStatus.success
                    ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'
                }`}
              >
                {testStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{testStatus.message}</div>
                  {testStatus.latencyMs !== undefined && (
                    <div className="mt-1 text-[11px] opacity-80 flex items-center space-x-3">
                      <span>Latency: {testStatus.latencyMs}ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus.loading}
                className="flex items-center space-x-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 disabled:opacity-40 transition-all"
              >
                <Zap className={`h-3.5 w-3.5 ${testStatus.loading ? 'animate-bounce' : 'text-cyan-400'}`} />
                <span>{testStatus.loading ? 'Testing Live API...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
