import {
  ProviderId,
  ChatRequest,
  StreamCallbacks,
  NormalizedProviderError,
  DynamicModel,
} from './types.ts';

interface OpenAiAdapterConfig {
  providerId: ProviderId;
  defaultBaseUrl: string;
  name: string;
  setupUrl: string;
  authHeaderPrefix?: string;
  extraHeaders?: (apiKey: string, extra?: Record<string, any>) => Record<string, string>;
  resolveBaseUrl?: (extra?: Record<string, any>) => string;
}

export class OpenAiAdapter {
  constructor(public config: OpenAiAdapterConfig) {}

  private getBaseUrl(extra?: Record<string, any>): string {
    if (this.config.resolveBaseUrl) {
      return this.config.resolveBaseUrl(extra);
    }
    return this.config.defaultBaseUrl;
  }

  private buildHeaders(apiKey: string, extra?: Record<string, any>): Record<string, string> {
    const prefix = this.config.authHeaderPrefix ?? 'Bearer';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `${prefix} ${apiKey}`.trim();
    }

    if (this.config.extraHeaders) {
      Object.assign(headers, this.config.extraHeaders(apiKey, extra));
    }

    return headers;
  }

  async testConnection(
    apiKey: string,
    extra?: Record<string, any>
  ): Promise<{ ok: boolean; latencyMs: number; modelCount: number; sampleModels: string[] }> {
    const startTime = Date.now();
    const baseUrl = this.getBaseUrl(extra);
    const headers = this.buildHeaders(apiKey, extra);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/models`;
      const resp = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!resp.ok) {
        const errorBody = await resp.json().catch(() => ({}));
        throw this.normalizeError(resp.status, errorBody, resp.statusText);
      }

      const data = await resp.json().catch(() => ({}));
      const rawList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const skipKeywords = ['whisper', 'tts', 'embed', 'moderation', 'guard', 'stt', 'audio', 'orpheus', 'vision', 'realtime'];
      const chatModels = rawList.filter((m: any) => {
        const id = (m.id || m.name || '').toLowerCase();
        return !skipKeywords.some((kw) => id.includes(kw));
      });
      chatModels.sort((a: any, b: any) => {
        const idA = (a.id || a.name || '').toLowerCase();
        const idB = (b.id || b.name || '').toLowerCase();
        if (idA.includes('gpt-oss-20b') || idA.includes('8b-instant')) return -1;
        if (idB.includes('gpt-oss-20b') || idB.includes('8b-instant')) return 1;
        return 0;
      });
      const sampleModels = chatModels.slice(0, 5).map((m: any) => m.id || m.name || String(m));

      return {
        ok: true,
        latencyMs,
        modelCount: chatModels.length,
        sampleModels,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.provider) throw err;
      throw this.normalizeNetworkError(err);
    }
  }

  async testChatCompletion(
    apiKey: string,
    extra?: Record<string, any>
  ): Promise<{ ok: boolean; latencyMs: number; modelUsed: string; responseText: string; modelCount: number; freeModelCount?: number }> {
    const startTime = Date.now();
    const baseUrl = this.getBaseUrl(extra);
    const headers = this.buildHeaders(apiKey, extra);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // 1. Fetch live models
      const modelsUrl = `${baseUrl.replace(/\/+$/, '')}/models`;
      const modelsResp = await fetch(modelsUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!modelsResp.ok) {
        const errorBody = await modelsResp.json().catch(() => ({}));
        throw this.normalizeError(modelsResp.status, errorBody, modelsResp.statusText);
      }

      const modelsData = await modelsResp.json().catch(() => ({}));
      const rawList = Array.isArray(modelsData?.data) ? modelsData.data : Array.isArray(modelsData) ? modelsData : [];
      
      const skipKeywords = ['whisper', 'tts', 'embed', 'moderation', 'guard', 'stt', 'audio', 'orpheus', 'vision', 'realtime'];
      const chatModels = rawList.filter((m: any) => {
        const id = (m.id || m.name || '').toLowerCase();
        return !skipKeywords.some((kw) => id.includes(kw));
      });

      if (chatModels.length === 0) {
        throw new Error('No chat-compatible models found from provider');
      }

      let freeModelCount = 0;
      const candidates: string[] = [];

      chatModels.sort((a: any, b: any) => {
        const idA = (a.id || a.name || '').toLowerCase();
        const idB = (b.id || b.name || '').toLowerCase();
        if (idA.includes('gpt-oss-20b') || idA.includes('8b-instant') || idA.includes('deepseek-chat')) return -1;
        if (idB.includes('gpt-oss-20b') || idB.includes('8b-instant') || idB.includes('deepseek-chat')) return 1;
        return 0;
      });
      for (const m of chatModels) {
        const id = m.id || m.name;
        if (id && !candidates.includes(id)) candidates.push(id);
      }

      if (candidates.length === 0) {
        throw new Error('No test candidates available');
      }

      // 2. Test real chat completion with candidate fallback
      const chatUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
      let lastErr: any = null;

      for (let i = 0; i < Math.min(candidates.length, 5); i++) {
        const testModel = candidates[i];
        try {
          const chatResp = await fetch(chatUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: testModel,
              messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
              max_tokens: 15,
            }),
            signal: controller.signal,
          });

          if (!chatResp.ok) {
            const errBody = await chatResp.json().catch(() => ({}));
            const normErr = this.normalizeError(chatResp.status, errBody, chatResp.statusText);
            if ((chatResp.status === 429 || chatResp.status === 503 || chatResp.status === 404) && i < Math.min(candidates.length, 5) - 1) {
              lastErr = normErr;
              continue;
            }
            throw normErr;
          }

          clearTimeout(timeoutId);
          const latencyMs = Date.now() - startTime;
          const chatData = await chatResp.json().catch(() => ({}));
          const responseText = chatData.choices?.[0]?.message?.content || 'OK';
          const actualModelReturned = chatData.model || testModel;

          return {
            ok: true,
            latencyMs,
            modelUsed: actualModelReturned,
            responseText: responseText.trim(),
            modelCount: chatModels.length,
            freeModelCount,
          };
        } catch (err: any) {
          if (err.statusCode === 429 && i < Math.min(candidates.length, 5) - 1) {
            lastErr = err;
            continue;
          }
          throw err;
        }
      }

      if (lastErr) throw lastErr;
      throw new Error('Chat completion test failed for all candidates');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.provider) throw err;
      throw this.normalizeNetworkError(err);
    }
  }

  async fetchModels(apiKey: string, extra?: Record<string, any>): Promise<DynamicModel[]> {
    const baseUrl = this.getBaseUrl(extra);
    const headers = this.buildHeaders(apiKey, extra);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/models`;
      const resp = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) return [];

      const data = await resp.json().catch(() => ({}));
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      const skipKeywords = ['whisper', 'tts', 'embed', 'moderation', 'guard', 'stt', 'audio', 'orpheus', 'vision', 'realtime'];
      const chatModels = list.filter((item: any) => {
        const id = (item.id || item.name || '').toLowerCase();
        return !skipKeywords.some((kw) => id.includes(kw));
      });

      return chatModels.map((item: any) => {
        const id = item.id || item.name || '';
        const isFree = this.config.providerId === 'groq';

        let tierLabel = isFree ? 'FREE DEV TIER' : 'LOW-COST PAID';
        let tierDetails = isFree ? 'Free developer tier' : 'Standard API billing';

        return {
          id,
          name: item.name || id,
          providerId: this.config.providerId,
          description: item.description || `Dynamic model from ${this.config.name}`,
          contextWindow: item.context_length ? `${Math.round(item.context_length / 1000)}k tokens` : undefined,
          isFree,
          tierLabel,
          tierDetails,
          isDynamic: true,
        };
      });
    } catch {
      clearTimeout(timeoutId);
      return [];
    }
  }

  async streamChat(
    req: ChatRequest,
    apiKey: string,
    callbacks: StreamCallbacks,
    clientSignal?: AbortSignal,
    extra?: Record<string, any>
  ): Promise<void> {
    const baseUrl = this.getBaseUrl(extra);
    const headers = this.buildHeaders(apiKey, extra);

    const formattedMessages = [...req.messages];
    if (req.systemInstruction && !formattedMessages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: req.systemInstruction });
    }

    const payload: any = {
      model: req.model,
      messages: formattedMessages,
      stream: true,
      temperature: typeof req.temperature === 'number' ? req.temperature : 0.7,
    };

    if (req.maxTokens) {
      payload.max_tokens = req.maxTokens;
    }

    // Set 90s server timeout for deep reasoning models
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    if (clientSignal) {
      clientSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errorJson = await resp.json().catch(() => ({}));
        const norm = this.normalizeError(resp.status, errorJson, resp.statusText);
        callbacks.onError(norm);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        callbacks.onError({
          provider: this.config.providerId,
          code: 'UPSTREAM_ERROR',
          statusCode: 500,
          message: 'Upstream stream reader unavailable',
          recoverable: true,
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let actualReturnedModel = req.model;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              callbacks.onDone({ model: actualReturnedModel });
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.model) {
                actualReturnedModel = parsed.model;
              }
              const choice = parsed.choices?.[0];
              if (choice) {
                // Support reasoning content (DeepSeek R1 / OpenRouter thinking models)
                const thinkingContent = choice.delta?.reasoning_content || choice.delta?.reasoning;
                if (thinkingContent && callbacks.onThinking) {
                  callbacks.onThinking(thinkingContent);
                }
                if (choice.delta?.content) {
                  callbacks.onDelta(choice.delta.content);
                }
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }

      callbacks.onDone({ model: actualReturnedModel });
    } catch (err: any) {
      clearTimeout(timeoutId);
      callbacks.onError(this.normalizeNetworkError(err));
    }
  }

  normalizeError(statusCode: number, body: any, statusText: string): NormalizedProviderError {
    const rawMessage =
      body?.error?.message ||
      body?.message ||
      body?.errors?.[0]?.message ||
      statusText ||
      'Unknown upstream error';

    let code: any = 'UPSTREAM_ERROR';
    let message = `${this.config.name}: ${rawMessage}`;
    let recoverable = false;

    if (statusCode === 401 || statusCode === 403) {
      code = 'INVALID_API_KEY';
      message = `Invalid or unauthorized API key for ${this.config.name}. Please verify your key.`;
      recoverable = true;
    } else if (statusCode === 429) {
      code = 'RATE_LIMITED';
      message = `Rate limit reached for ${this.config.name}. Please wait a moment before sending another message.`;
      recoverable = true;
    } else if (statusCode === 402) {
      code = 'INSUFFICIENT_CREDITS';
      message = `Insufficient credits/quota on your ${this.config.name} account.`;
      recoverable = false;
    } else if (statusCode === 404) {
      code = 'MODEL_NOT_FOUND';
      message = `The requested model is unavailable or retired on ${this.config.name}.`;
      recoverable = true;
    }

    return {
      provider: this.config.providerId,
      code,
      statusCode,
      message,
      setupUrl: this.config.setupUrl,
      recoverable,
    };
  }

  normalizeNetworkError(err: any): NormalizedProviderError {
    if (err.name === 'AbortError') {
      return {
        provider: this.config.providerId,
        code: 'TIMEOUT',
        statusCode: 408,
        message: `Request to ${this.config.name} timed out or was cancelled by user.`,
        recoverable: true,
      };
    }

    return {
      provider: this.config.providerId,
      code: 'UPSTREAM_ERROR',
      statusCode: 502,
      message: `Failed to connect to ${this.config.name}: ${err.message || 'Network error'}`,
      setupUrl: this.config.setupUrl,
      recoverable: true,
    };
  }
}
