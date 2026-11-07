import express from 'express';
import {
  ProviderId,
  ChatRequest,
  NormalizedProviderError,
  ProviderStatus,
} from './types.ts';
import { GeminiAdapter } from './adapter-gemini.ts';
import { OpenAiAdapter } from './adapter-openai.ts';
import {
  getFullCatalog,
  updateProviderDynamicModels,
} from './catalog.ts';

export const router = express.Router();

// Initialize Adapters for Gemini, Groq, and DeepSeek
const geminiAdapter = new GeminiAdapter();

const groqAdapter = new OpenAiAdapter({
  providerId: 'groq',
  name: 'Groq',
  defaultBaseUrl: 'https://api.groq.com/openai/v1',
  setupUrl: 'https://console.groq.com/keys',
});

const deepSeekAdapter = new OpenAiAdapter({
  providerId: 'deepseek',
  name: 'DeepSeek',
  defaultBaseUrl: 'https://api.deepseek.com',
  setupUrl: 'https://platform.deepseek.com/api_keys',
});

import {
  getMaskedProfiles,
  getProfileById,
  getActiveProfileForProvider,
  addProfile,
  updateProfile,
  deleteProfile,
  setTestStatus,
  maskKey,
} from './key-store.ts';

// Custom adapter factory
function getCustomAdapter(customEndpoint: string): OpenAiAdapter {
  return new OpenAiAdapter({
    providerId: 'custom',
    name: 'Custom Endpoint',
    defaultBaseUrl: customEndpoint,
    setupUrl: '',
  });
}

// Credentials Resolver (Prioritizes server-side env vars -> server saved keys -> client key)
function resolveCredentials(
  provider: ProviderId,
  clientKey?: string,
  _clientAccountId?: string
): { apiKey: string; baseUrl?: string; defaultModel?: string; source: 'server_env' | 'server_saved' | 'client_key' | 'none' } {
  if (provider === 'gemini') {
    const serverKey = process.env.GEMINI_API_KEY;
    if (serverKey) return { apiKey: serverKey, source: 'server_env' };
  } else if (provider === 'groq') {
    const serverKey = process.env.GROQ_API_KEY;
    if (serverKey) return { apiKey: serverKey, source: 'server_env' };
  } else if (provider === 'deepseek') {
    const serverKey = process.env.DEEPSEEK_API_KEY;
    if (serverKey) return { apiKey: serverKey, source: 'server_env' };
  }

  // Check saved server key profiles
  const savedProfile = getActiveProfileForProvider(provider);
  if (savedProfile && savedProfile.apiKey) {
    return {
      apiKey: savedProfile.apiKey,
      baseUrl: savedProfile.baseUrl,
      defaultModel: savedProfile.defaultModel,
      source: 'server_saved',
    };
  }

  if (clientKey) {
    return { apiKey: clientKey, source: 'client_key' };
  }

  return { apiKey: '', source: 'none' };
}

// Input validation & SSRF prevention for custom endpoints
function sanitizeCustomUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Custom endpoint must use http:// or https://');
    }
    // Block AWS/GCP metadata IP
    if (parsed.hostname === '169.254.169.254' || parsed.hostname === 'metadata.google.internal') {
      throw new Error('Restricted host address is not permitted');
    }
    return trimmed;
  } catch (err: any) {
    throw new Error(`Invalid custom endpoint URL: ${err.message}`);
  }
}

// SSE helper
function sseSend(res: express.Response, event: string, data: any) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
}

// GET /api/providers/status
router.get('/providers/status', (_req, res) => {
  const catalog = getFullCatalog();

  const statuses: ProviderStatus[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      configured: Boolean(process.env.GEMINI_API_KEY),
      isDefault: true,
      source: process.env.GEMINI_API_KEY ? 'server_env' : 'none',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      modelsCount: catalog.filter((m) => m.providerId === 'gemini').length,
    },
    {
      id: 'groq',
      name: 'Groq',
      configured: Boolean(process.env.GROQ_API_KEY),
      isDefault: false,
      source: process.env.GROQ_API_KEY ? 'server_env' : 'none',
      endpoint: 'https://api.groq.com/openai/v1',
      modelsCount: catalog.filter((m) => m.providerId === 'groq').length,
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      isDefault: false,
      source: process.env.DEEPSEEK_API_KEY ? 'server_env' : 'none',
      endpoint: 'https://api.deepseek.com',
      modelsCount: catalog.filter((m) => m.providerId === 'deepseek').length,
    },
    {
      id: 'custom',
      name: 'Custom Endpoint',
      configured: false,
      isDefault: false,
      source: 'none',
      endpoint: 'User Configured',
      modelsCount: 1,
    },
  ];

  res.json({
    providers: statuses,
    timestamp: Date.now(),
  });
});

// --- API Key Manager Endpoints ---

// GET /api/keys - List all saved key profiles (with MASKED keys)
router.get('/keys', (_req, res) => {
  res.json({
    keys: getMaskedProfiles(),
    timestamp: Date.now(),
  });
});

// POST /api/keys - Add new key profile
router.post('/keys', (req, res) => {
  const { provider, label, apiKey, baseUrl, defaultModel, isDefault } = req.body;

  if (!provider || !apiKey) {
    return res.status(400).json({ ok: false, message: 'Provider and API key are required' });
  }

  let sanitizedUrl = baseUrl ? baseUrl.trim() : undefined;
  if (sanitizedUrl) {
    try {
      sanitizedUrl = sanitizeCustomUrl(sanitizedUrl);
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  }

  const profile = addProfile({
    provider,
    label: label || `${provider.toUpperCase()} Key`,
    apiKey,
    baseUrl: sanitizedUrl,
    defaultModel: defaultModel?.trim(),
    isDefault: Boolean(isDefault),
  });

  res.json({
    ok: true,
    message: `Saved key "${profile.label}" securely on server`,
    key: {
      id: profile.id,
      provider: profile.provider,
      label: profile.label,
      maskedApiKey: maskKey(profile.apiKey),
      hasApiKey: true,
      baseUrl: profile.baseUrl,
      defaultModel: profile.defaultModel,
      enabled: profile.enabled,
      isDefault: profile.isDefault,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  });
});

// PUT /api/keys/:id - Edit saved key profile
router.put('/keys/:id', (req, res) => {
  const { id } = req.params;
  const { label, apiKey, baseUrl, defaultModel, enabled, isDefault } = req.body;

  let sanitizedUrl = baseUrl ? baseUrl.trim() : undefined;
  if (sanitizedUrl) {
    try {
      sanitizedUrl = sanitizeCustomUrl(sanitizedUrl);
    } catch (err: any) {
      return res.status(400).json({ ok: false, message: err.message });
    }
  }

  const updated = updateProfile(id, {
    label,
    apiKey,
    baseUrl: sanitizedUrl,
    defaultModel,
    enabled,
    isDefault,
  });

  if (!updated) {
    return res.status(404).json({ ok: false, message: 'Saved key profile not found' });
  }

  res.json({
    ok: true,
    message: `Updated key "${updated.label}"`,
    key: {
      id: updated.id,
      provider: updated.provider,
      label: updated.label,
      maskedApiKey: maskKey(updated.apiKey),
      hasApiKey: Boolean(updated.apiKey),
      baseUrl: updated.baseUrl,
      defaultModel: updated.defaultModel,
      enabled: updated.enabled,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
});

// DELETE /api/keys/:id - Delete saved key profile
router.delete('/keys/:id', (req, res) => {
  const { id } = req.params;
  const deleted = deleteProfile(id);
  if (!deleted) {
    return res.status(404).json({ ok: false, message: 'Saved key profile not found' });
  }
  res.json({ ok: true, message: 'Key profile deleted from server storage' });
});

// POST /api/keys/:id/toggle - Enable or disable key profile
router.post('/keys/:id/toggle', (req, res) => {
  const { id } = req.params;
  const profile = getProfileById(id);
  if (!profile) {
    return res.status(404).json({ ok: false, message: 'Saved key profile not found' });
  }
  const updated = updateProfile(id, { enabled: !profile.enabled });
  res.json({
    ok: true,
    message: `Key "${updated?.label}" is now ${updated?.enabled ? 'enabled' : 'disabled'}`,
    enabled: updated?.enabled,
  });
});

// POST /api/keys/:id/default - Set key profile as default for provider
router.post('/keys/:id/default', (req, res) => {
  const { id } = req.params;
  const profile = getProfileById(id);
  if (!profile) {
    return res.status(404).json({ ok: false, message: 'Saved key profile not found' });
  }
  const updated = updateProfile(id, { isDefault: true, enabled: true });
  res.json({
    ok: true,
    message: `Key "${updated?.label}" set as default for provider ${updated?.provider}`,
    isDefault: true,
  });
});

// POST /api/keys/:id/test - Test connection for a specific saved key profile
router.post('/keys/:id/test', async (req, res) => {
  const { id } = req.params;
  const profile = getProfileById(id);

  if (!profile) {
    return res.status(404).json({ ok: false, message: 'Saved key profile not found' });
  }

  try {
    let result: any = null;
    if (profile.provider === 'gemini') {
      result = await geminiAdapter.testConnection(profile.apiKey);
    } else if (profile.provider === 'groq') {
      result = await groqAdapter.testChatCompletion(profile.apiKey);
    } else if (profile.provider === 'deepseek') {
      result = await deepSeekAdapter.testChatCompletion(profile.apiKey);
    } else if (profile.provider === 'custom' || profile.baseUrl) {
      const sanitized = sanitizeCustomUrl(profile.baseUrl || 'http://localhost:11434/v1');
      const custom = getCustomAdapter(sanitized);
      result = await custom.testConnection(profile.apiKey);
    }

    setTestStatus(id, { ok: true, latencyMs: result?.latencyMs });

    return res.json({
      ok: true,
      message: `Key "${profile.label}" connected successfully! (${result?.latencyMs ?? 0}ms)`,
      latencyMs: result?.latencyMs,
      modelUsed: result?.modelUsed,
      responseText: result?.responseText,
    });
  } catch (err: any) {
    const code = err.code || (err.statusCode === 402 ? 'INSUFFICIENT_CREDITS' : 'UPSTREAM_ERROR');
    const message = err.statusCode === 402
      ? 'Authenticated – Credits Required (Provider API balance top-up required)'
      : err.message || 'Connection test failed';

    setTestStatus(id, { ok: false, statusCode: err.statusCode, code, message });

    return res.status(err.statusCode || 500).json({
      ok: false,
      code,
      message,
    });
  }
});

// GET /api/models - Returns dynamic + baseline model catalog
router.get('/models', (_req, res) => {
  res.json({
    models: getFullCatalog(),
    timestamp: Date.now(),
  });
});

// POST /api/models/refresh - Fetch live model lists from Gemini, Groq, and DeepSeek
router.post('/models/refresh', async (req, res) => {
  const { clientKeys = {} } = req.body;
  const results: Record<string, { count: number; status: string }> = {};

  const providersToFetch: ProviderId[] = ['gemini', 'groq', 'deepseek'];

  await Promise.all(
    providersToFetch.map(async (pId) => {
      try {
        const clientKey = clientKeys[pId]?.apiKey;
        const creds = resolveCredentials(pId, clientKey);

        if (!creds.apiKey) {
          results[pId] = { count: 0, status: 'unconfigured' };
          return;
        }

        let dynamicList: any[] = [];
        if (pId === 'gemini') {
          dynamicList = await geminiAdapter.fetchModels(creds.apiKey);
        } else if (pId === 'groq') {
          dynamicList = await groqAdapter.fetchModels(creds.apiKey);
        } else if (pId === 'deepseek') {
          dynamicList = await deepSeekAdapter.fetchModels(creds.apiKey);
        }

        if (dynamicList.length > 0) {
          updateProviderDynamicModels(pId, dynamicList);
          results[pId] = { count: dynamicList.length, status: 'updated' };
        } else {
          results[pId] = { count: 0, status: 'empty_or_unchanged' };
        }
      } catch (err: any) {
        results[pId] = { count: 0, status: `error: ${err.message}` };
      }
    })
  );

  res.json({
    success: true,
    refreshed: results,
    models: getFullCatalog(),
  });
});

// POST /api/providers/test - Test connection for a provider
router.post('/providers/test', async (req, res) => {
  const { provider, apiKey, accountId, customEndpoint } = req.body;

  if (!provider) {
    return res.status(400).json({ ok: false, message: 'Provider parameter is required' });
  }

  const creds = resolveCredentials(provider, apiKey, accountId);

  try {
    if (provider === 'gemini') {
      if (!creds.apiKey) {
        return res.status(400).json({ ok: false, message: 'Gemini API key is not configured' });
      }
      const result = await geminiAdapter.testConnection(creds.apiKey);
      return res.json({
        provider: 'gemini',
        message: `Google Gemini connected successfully! (${result.latencyMs}ms)`,
        ...result,
      });
    }

    if (provider === 'groq') {
      if (!creds.apiKey) return res.status(400).json({ ok: false, message: 'Groq API key is missing' });
      const result = await groqAdapter.testChatCompletion(creds.apiKey);
      return res.json({
        provider: 'groq',
        message: `Groq LPU Engine connected! Tested chat model "${result.modelUsed}" with response: "${result.responseText}" (${result.latencyMs}ms)`,
        ...result,
      });
    }

    if (provider === 'deepseek') {
      if (!creds.apiKey) return res.status(400).json({ ok: false, message: 'DeepSeek API key is missing' });
      const result = await deepSeekAdapter.testChatCompletion(creds.apiKey);
      return res.json({
        provider: 'deepseek',
        message: `DeepSeek API connected! Tested chat model "${result.modelUsed}" with response: "${result.responseText}" (${result.latencyMs}ms)`,
        ...result,
      });
    }

    if (provider === 'custom') {
      const sanitized = sanitizeCustomUrl(customEndpoint);
      if (!sanitized) {
        return res.status(400).json({ ok: false, message: 'Custom endpoint URL is required' });
      }
      const custom = getCustomAdapter(sanitized);
      const result = await custom.testConnection(creds.apiKey);
      return res.json({
        provider: 'custom',
        message: `Custom endpoint verified! (${result.latencyMs}ms)`,
        ...result,
      });
    }

    return res.status(400).json({ ok: false, message: `Unsupported provider: ${provider}` });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      provider,
      code: err.code || 'UPSTREAM_ERROR',
      message: err.message || 'Connection test failed',
    });
  }
});

// POST /api/chat - Unified Streaming Chat Endpoint
router.post('/chat', async (req, res) => {
  const {
    provider = 'gemini',
    model,
    messages = [],
    apiKey,
    accountId,
    customEndpoint,
    temperature = 0.7,
    maxTokens,
    systemInstruction,
  }: ChatRequest = req.body;

  // Input validation
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array cannot be empty' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const closeStream = () => {
    try {
      if (!res.writableEnded) res.end();
    } catch {}
  };

  const clientController = new AbortController();
  req.on('aborted', () => clientController.abort());

  const effectiveSystemInstruction = [
    `CRITICAL IDENTITY RULE: You are an AI assistant powered by provider "${provider}" using exact model ID "${model}".`,
    `You must never claim to be ChatGPT, GPT-4, Gemini or any other model unless that is your actual configured model ID ("${model}"). Always be completely honest about your model identity.`,
    systemInstruction,
  ].filter(Boolean).join('\n\n');

  const callbacks = {
    onDelta: (text: string) => {
      sseSend(res, 'delta', { text });
    },
    onThinking: (text: string) => {
      sseSend(res, 'thinking', { text });
    },
    onDone: (metadata?: any) => {
      sseSend(res, 'done', { provider, model, ...metadata });
      closeStream();
    },
    onError: (err: NormalizedProviderError) => {
      sseSend(res, 'error', err);
      closeStream();
    },
  };

  const creds = resolveCredentials(provider, apiKey, accountId);

  if (!creds.apiKey && provider !== 'custom') {
    callbacks.onError({
      provider,
      code: 'MISSING_API_KEY',
      statusCode: 401,
      message: `${provider.toUpperCase()} API Key is missing. Please set ${provider.toUpperCase()}_API_KEY in your server environment or configure it in Provider Settings.`,
      setupUrl: getSetupUrl(provider),
      recoverable: true,
    });
    return;
  }

  try {
    if (provider === 'gemini') {
      await geminiAdapter.streamChat(
        { provider, model: model || 'gemini-3.1-flash-lite', messages, temperature, maxTokens, systemInstruction: effectiveSystemInstruction },
        creds.apiKey,
        callbacks,
        clientController.signal
      );
      return;
    }

    if (provider === 'groq') {
      await groqAdapter.streamChat(
        { provider, model: model || 'openai/gpt-oss-20b', messages, temperature, maxTokens, systemInstruction: effectiveSystemInstruction },
        creds.apiKey,
        callbacks,
        clientController.signal
      );
      return;
    }

    if (provider === 'deepseek') {
      await deepSeekAdapter.streamChat(
        { provider, model: model || 'deepseek-chat', messages, temperature, maxTokens, systemInstruction: effectiveSystemInstruction },
        creds.apiKey,
        callbacks,
        clientController.signal
      );
      return;
    }

    if (provider === 'custom') {
      const sanitized = sanitizeCustomUrl(customEndpoint);
      if (!sanitized) {
        callbacks.onError({
          provider: 'custom',
          code: 'INVALID_REQUEST',
          statusCode: 400,
          message: 'A valid custom endpoint URL is required (e.g. http://localhost:11434/v1)',
          recoverable: true,
        });
        return;
      }
      const custom = getCustomAdapter(sanitized);
      await custom.streamChat(
        { provider, model: model || 'custom-model', messages, temperature, maxTokens, systemInstruction: effectiveSystemInstruction },
        creds.apiKey,
        callbacks,
        clientController.signal
      );
      return;
    }

    callbacks.onError({
      provider,
      code: 'INVALID_REQUEST',
      statusCode: 400,
      message: `Unknown provider: ${provider}`,
      recoverable: false,
    });
  } catch (err: any) {
    callbacks.onError({
      provider,
      code: 'UPSTREAM_ERROR',
      statusCode: 500,
      message: err.message || 'Internal server error while processing AI chat',
      recoverable: true,
    });
  }
});

function getSetupUrl(provider: ProviderId): string {
  switch (provider) {
    case 'gemini':
      return 'https://aistudio.google.com/apikey';
    case 'groq':
      return 'https://console.groq.com/keys';
    case 'deepseek':
      return 'https://platform.deepseek.com/api_keys';
    default:
      return '';
  }
}
