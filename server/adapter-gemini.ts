import { GoogleGenAI } from '@google/genai';
import {
  ChatRequest,
  StreamCallbacks,
  NormalizedProviderError,
  DynamicModel,
} from './types.ts';

export class GeminiAdapter {
  private defaultBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async testConnection(
    apiKey: string
  ): Promise<{ ok: boolean; latencyMs: number; modelCount: number; sampleModels: string[] }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(
        `${this.defaultBaseUrl}/models?key=${encodeURIComponent(apiKey)}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw this.normalizeError(resp.status, body);
      }

      const data = await resp.json().catch(() => ({}));
      const models = Array.isArray(data?.models) ? data.models : [];
      const sampleModels = models
        .slice(0, 5)
        .map((m: any) => (m.name || '').replace('models/', ''));

      return {
        ok: true,
        latencyMs,
        modelCount: models.length,
        sampleModels,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.provider) throw err;
      throw this.normalizeNetworkError(err);
    }
  }

  async fetchModels(apiKey: string): Promise<DynamicModel[]> {
    try {
      const resp = await fetch(
        `${this.defaultBaseUrl}/models?key=${encodeURIComponent(apiKey)}`
      );
      if (!resp.ok) return [];

      const data = await resp.json().catch(() => ({}));
      const list = Array.isArray(data?.models) ? data.models : [];

      return list
        .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m: any) => {
          const rawId = (m.name || '').replace('models/', '');
          const isFree = !rawId.includes('argon') && !rawId.includes('pro');
          return {
            id: rawId,
            name: m.displayName || rawId,
            providerId: 'gemini' as const,
            description: m.description || 'Google Gemini model',
            contextWindow: m.inputTokenLimit
              ? `${Math.round(m.inputTokenLimit / 1000)}k tokens`
              : '1M tokens',
            isFree,
            tierLabel: isFree ? 'FREE IN AI STUDIO' : 'PAID TIER',
            tierDetails: isFree
              ? 'Included in standard Google AI Studio quota'
              : 'Requires billing project key in AI Studio',
            isDynamic: true,
          };
        });
    } catch {
      return [];
    }
  }

  async streamChat(
    req: ChatRequest,
    apiKey: string,
    callbacks: StreamCallbacks,
    clientSignal?: AbortSignal
  ): Promise<void> {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contents = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const systemMsg =
      req.messages.find((m) => m.role === 'system')?.content || req.systemInstruction;

    let modelName = req.model || 'gemini-3.1-flash-lite';
    const config: any = {};
    if (systemMsg) {
      config.systemInstruction = systemMsg;
    }

    try {
      let responseStream;
      try {
        responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });
      } catch (err: any) {
        // If 503 high demand spike on 3.8-flash, seamlessly fallback to gemini-3.1-flash-lite
        if (
          modelName === 'gemini-3.8-flash' &&
          (err.status === 503 ||
            err.message?.includes('503') ||
            err.message?.includes('high demand') ||
            err.message?.includes('UNAVAILABLE'))
        ) {
          console.warn('Gemini 3.8 Flash high demand, falling back to Gemini 3.1 Flash Lite');
          modelName = 'gemini-3.1-flash-lite';
          responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents,
            config: Object.keys(config).length > 0 ? config : undefined,
          });
        } else {
          throw err;
        }
      }

      for await (const chunk of responseStream) {
        if (clientSignal?.aborted) return;
        const text = chunk.text;
        if (text) {
          callbacks.onDelta(text);
        }
      }

      callbacks.onDone();
    } catch (err: any) {
      callbacks.onError(this.normalizeError(err.status || 500, err));
    }
  }

  normalizeError(statusCode: number, err: any): NormalizedProviderError {
    const rawMsg = err?.message || err?.error?.message || 'Gemini service error';
    let code: any = 'UPSTREAM_ERROR';
    let message = `Google Gemini: ${rawMsg}`;
    let recoverable = false;

    if (statusCode === 400 || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
      code = 'INVALID_API_KEY';
      message = 'Invalid Google Gemini API key. Please check your key in Provider Settings or AI Studio Secrets.';
      recoverable = true;
    } else if (statusCode === 403 || rawMsg.includes('PERMISSION_DENIED')) {
      code = 'INVALID_API_KEY';
      message = 'Permission denied for Google Gemini. Please check API key project permissions.';
      recoverable = true;
    } else if (statusCode === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      code = 'RATE_LIMITED';
      message = 'Gemini quota or rate limit exceeded. If using advanced models, upgrade to a billing-enabled key.';
      recoverable = true;
    } else if (statusCode === 404) {
      code = 'MODEL_NOT_FOUND';
      message = 'The specified Gemini model was not found or is unsupported.';
      recoverable = true;
    }

    return {
      provider: 'gemini',
      code,
      statusCode,
      message,
      setupUrl: 'https://aistudio.google.com/apikey',
      recoverable,
    };
  }

  normalizeNetworkError(err: any): NormalizedProviderError {
    if (err.name === 'AbortError') {
      return {
        provider: 'gemini',
        code: 'TIMEOUT',
        statusCode: 408,
        message: 'Request to Google Gemini timed out.',
        recoverable: true,
      };
    }

    return {
      provider: 'gemini',
      code: 'UPSTREAM_ERROR',
      statusCode: 502,
      message: `Failed to connect to Google Gemini: ${err.message}`,
      setupUrl: 'https://aistudio.google.com/apikey',
      recoverable: true,
    };
  }
}
