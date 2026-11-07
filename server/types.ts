export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'deepseek'
  | 'custom';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  provider: ProviderId;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  apiKey?: string;
  accountId?: string;
  customEndpoint?: string;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onThinking?: (text: string) => void;
  onDone: (metadata?: { promptTokens?: number; completionTokens?: number; model?: string }) => void;
  onError: (error: NormalizedProviderError) => void;
}

export type ErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_CREDITS'
  | 'MODEL_NOT_FOUND'
  | 'TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'INVALID_REQUEST';

export interface NormalizedProviderError {
  provider: ProviderId;
  code: ErrorCode;
  statusCode: number;
  message: string;
  details?: string;
  setupUrl?: string;
  recoverable: boolean;
}

export interface DynamicModel {
  id: string;
  name: string;
  providerId: ProviderId;
  description: string;
  contextWindow?: string;
  isFree: boolean;
  tierLabel: string;
  tierDetails: string;
  isDynamic: boolean;
}

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  configured: boolean;
  isDefault: boolean;
  source: 'server_env' | 'client_key' | 'none';
  endpoint: string;
  modelsCount: number;
}
