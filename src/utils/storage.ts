import { ProviderConfigs, Conversation, ProviderId, UsageStats } from '../types/chat';

const CONFIGS_KEY = 'omnichat_provider_configs_v1';
const CONVERSATIONS_KEY = 'omnichat_conversations_v1';
const ACTIVE_CONV_KEY = 'omnichat_active_conv_v1';
const USAGE_STATS_KEY = 'omnichat_usage_stats_v1';

export const DEFAULT_CONFIGS: ProviderConfigs = {
  gemini: { apiKey: '', temperature: 0.7 },
  groq: { apiKey: '', temperature: 0.7 },
  deepseek: { apiKey: '', temperature: 0.7 },
  custom: { apiKey: '', customEndpoint: '', customModel: '', temperature: 0.7 },
};

export const DEFAULT_USAGE_STATS: UsageStats = {
  gemini: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, requestCount: 0 },
  groq: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, requestCount: 0 },
  deepseek: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, requestCount: 0 },
  custom: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, requestCount: 0 },
};

export function loadConfigs(): ProviderConfigs {
  try {
    const raw = localStorage.getItem(CONFIGS_KEY);
    if (!raw) return DEFAULT_CONFIGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIGS, ...parsed };
  } catch (e) {
    console.error('Error loading provider configs:', e);
    return DEFAULT_CONFIGS;
  }
}

export function saveConfigs(configs: ProviderConfigs): void {
  try {
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
  } catch (e) {
    console.error('Error saving provider configs:', e);
  }
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading conversations:', e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Error saving conversations:', e);
  }
}

export function getActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONV_KEY);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CONV_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  } catch {}
}

export function loadUsageStats(): UsageStats {
  try {
    const raw = localStorage.getItem(USAGE_STATS_KEY);
    if (!raw) return DEFAULT_USAGE_STATS;
    return { ...DEFAULT_USAGE_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USAGE_STATS;
  }
}

export function saveUsageStats(stats: UsageStats): void {
  try {
    localStorage.setItem(USAGE_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving usage stats:', e);
  }
}

export function recordTokenUsage(
  provider: ProviderId,
  promptTokens: number,
  completionTokens: number,
  estimatedCost: number = 0
): UsageStats {
  const current = loadUsageStats();
  const prev = current[provider] || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    requestCount: 0,
  };

  const total = promptTokens + completionTokens;
  const updated: UsageStats = {
    ...current,
    [provider]: {
      promptTokens: prev.promptTokens + promptTokens,
      completionTokens: prev.completionTokens + completionTokens,
      totalTokens: prev.totalTokens + total,
      estimatedCostUsd: prev.estimatedCostUsd + estimatedCost,
      requestCount: prev.requestCount + 1,
    },
  };

  saveUsageStats(updated);
  return updated;
}

export function isProviderReady(
  providerId: ProviderId,
  configs: ProviderConfigs,
  serverStatus: any
): boolean {
  // Check if configured via server environment variable
  const serverProvider = serverStatus?.providers?.find((p: any) => p.id === providerId);
  if (serverProvider?.configured) {
    return true;
  }
  if (serverStatus?.[providerId]?.hasServerKey) {
    return true;
  }

  const cfg = configs[providerId];

  if (providerId === 'custom') {
    return Boolean(cfg?.customEndpoint);
  }

  return Boolean(cfg?.apiKey && cfg.apiKey.trim().length > 0);
}
