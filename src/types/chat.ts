export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'deepseek'
  | 'custom';

export type ModelTier = 'free' | 'free_dev' | 'free_trial' | 'paid' | 'custom';

export interface ModelInfo {
  id: string;
  name: string;
  providerId: ProviderId;
  description: string;
  contextWindow: string;
  tier: ModelTier;
  tierLabel: string;
  tierDetails: string;
  isFree: boolean;
  category: 'fast' | 'reasoning' | 'general' | 'coding' | 'flagship';
  supportsThinking?: boolean;
  isDynamic?: boolean;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  tagline: string;
  website: string;
  apiKeyUrl: string;
  keyPlaceholder: string;
  description: string;
  requiresAccountId?: boolean;
  accentColor: string;
  gradient: string;
  models: ModelInfo[];
  defaultModelId: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  provider: ProviderId;
  model: string;
  timestamp: number;
  streaming?: boolean;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ProviderUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  requestCount: number;
}

export type UsageStats = Record<ProviderId, ProviderUsageStats>;

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  provider: ProviderId;
  model: string;
  systemPrompt?: string;
}

export interface ProviderConfig {
  apiKey: string;
  accountId?: string; // Cloudflare
  customEndpoint?: string; // Custom
  customModel?: string; // Custom
  temperature?: number;
  maxTokens?: number;
}

export type ProviderConfigs = Record<ProviderId, ProviderConfig>;

export interface ServerProviderItem {
  id: ProviderId;
  name: string;
  configured: boolean;
  isDefault: boolean;
  source: 'server_env' | 'client_key' | 'none';
  endpoint: string;
  modelsCount: number;
}

export interface ServerProviderStatusResponse {
  providers: ServerProviderItem[];
  timestamp: number;
}
