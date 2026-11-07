import { ProviderId, DynamicModel } from './types.ts';

export const BASELINE_CATALOG: DynamicModel[] = [
  // Google Gemini
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    providerId: 'gemini',
    description: 'Ultra-low latency model engineered for responsive conversational chat.',
    contextWindow: '1M tokens',
    isFree: true,
    tierLabel: 'FREE IN AI STUDIO',
    tierDetails: 'Free tier available in Google AI Studio quota (15 RPM / 1M TPM).',
    isDynamic: false,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    providerId: 'gemini',
    description: 'Multimodal flagship balance of intelligence, speed, and long context.',
    contextWindow: '1M tokens',
    isFree: true,
    tierLabel: 'FREE IN AI STUDIO',
    tierDetails: 'Generous free tier quota in Google AI Studio.',
    isDynamic: false,
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    providerId: 'gemini',
    description: 'Advanced frontier reasoning model for complex STEM and software engineering.',
    contextWindow: '2M tokens',
    isFree: false,
    tierLabel: 'PAID TIER',
    tierDetails: 'Requires pay-as-you-go billing in Google AI Studio.',
    isDynamic: false,
  },

  // Groq
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT OSS 20B',
    providerId: 'groq',
    description: 'High performance open-weights model hosted on Groq LPU.',
    contextWindow: '8k tokens',
    isFree: true,
    tierLabel: 'FREE DEV TIER',
    tierDetails: 'Free developer tier on console.groq.com.',
    isDynamic: false,
  },
  {
    id: 'llama-3.3-70b-specdec',
    name: 'Llama 3.3 70B SpecDec',
    providerId: 'groq',
    description: 'Meta 70B speculative decoding model running at ultra-fast Groq LPU speeds.',
    contextWindow: '8k tokens',
    isFree: true,
    tierLabel: 'FREE DEV TIER',
    tierDetails: 'Free developer tier on console.groq.com.',
    isDynamic: false,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    providerId: 'groq',
    description: 'Ultra-fast LPU inference exceeding 800+ tokens/sec for rapid responses.',
    contextWindow: '128k tokens',
    isFree: true,
    tierLabel: 'FREE DEV TIER',
    tierDetails: 'Free developer tier with generous rate limits.',
    isDynamic: false,
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill Llama 70B',
    providerId: 'groq',
    description: 'DeepSeek R1 reasoning architecture distilled onto Llama 70B.',
    contextWindow: '128k tokens',
    isFree: true,
    tierLabel: 'FREE DEV TIER',
    tierDetails: 'Developer tier accessible on Groq with chain-of-thought tokens.',
    isDynamic: false,
  },
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B Versatile',
    providerId: 'groq',
    description: 'Versatile Meta 70B model with 128k context on Groq LPU.',
    contextWindow: '128k tokens',
    isFree: true,
    tierLabel: 'FREE DEV TIER',
    tierDetails: 'Free developer tier on Groq.',
    isDynamic: false,
  },

  // DeepSeek
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3 (Chat)',
    providerId: 'deepseek',
    description: '671B Mixture of Experts architecture with 37B active parameters.',
    contextWindow: '64k tokens',
    isFree: false,
    tierLabel: 'LOW-COST PAID',
    tierDetails: 'New accounts receive 5M free tokens (~$0.14/1M input, ~$0.28/1M output).',
    isDynamic: false,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1 (Reasoner)',
    providerId: 'deepseek',
    description: 'Frontier reasoning model generating visible chain-of-thought tokens.',
    contextWindow: '64k tokens',
    isFree: false,
    tierLabel: 'LOW-COST PAID',
    tierDetails: 'Chain-of-thought enabled (~$0.55/1M input, ~$2.19/1M output).',
    isDynamic: false,
  },
  {
    id: 'deepseek-flash',
    name: 'DeepSeek-V4.1-Flash',
    providerId: 'deepseek',
    description: 'Ultra-fast, lightweight DeepSeek flash model for rapid conversational chat.',
    contextWindow: '128k tokens',
    isFree: false,
    tierLabel: 'LOW-COST PAID',
    tierDetails: 'Fast inference tier (~$0.07/1M input, ~$0.14/1M output).',
    isDynamic: false,
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek-V4-Pro',
    providerId: 'deepseek',
    description: 'Frontier DeepSeek-V4 Pro model with enhanced reasoning and code synthesis.',
    contextWindow: '128k tokens',
    isFree: false,
    tierLabel: 'PAID API',
    tierDetails: 'High performance tier (~$0.27/1M input, ~$1.10/1M output).',
    isDynamic: false,
  },

  // Custom Endpoint
  {
    id: 'custom-model',
    name: 'Custom Model ID',
    providerId: 'custom',
    description: 'User-specified model identifier running on your endpoint.',
    contextWindow: 'Configurable',
    isFree: false,
    tierLabel: 'CUSTOM CONFIG',
    tierDetails: 'Determined by your private host or external provider.',
    isDynamic: false,
  },
];

// In-memory dynamic model store per provider
const dynamicStore: Map<ProviderId, DynamicModel[]> = new Map();

export function getFullCatalog(): DynamicModel[] {
  const merged = [...BASELINE_CATALOG];
  const knownIds = new Set(merged.map((m) => `${m.providerId}:${m.id}`));

  for (const [providerId, models] of dynamicStore.entries()) {
    for (const model of models) {
      const key = `${providerId}:${model.id}`;
      if (!knownIds.has(key)) {
        merged.push(model);
        knownIds.add(key);
      }
    }
  }

  return merged;
}

export function updateProviderDynamicModels(providerId: ProviderId, models: DynamicModel[]) {
  dynamicStore.set(providerId, models);
}

export function getModelsForProvider(providerId: ProviderId): DynamicModel[] {
  return getFullCatalog().filter((m) => m.providerId === providerId);
}
