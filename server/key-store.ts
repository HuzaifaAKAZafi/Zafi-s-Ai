import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderId } from './types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../.data');
const KEYS_FILE = path.resolve(DATA_DIR, 'server-keys.json');

export interface SavedKeyProfile {
  id: string;
  provider: ProviderId;
  label: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  lastTestStatus?: {
    ok: boolean;
    statusCode?: number;
    code?: string;
    message?: string;
    latencyMs?: number;
    testedAt?: number;
  };
}

export interface MaskedKeyProfile {
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

// In-memory key profile store
let keyProfiles: SavedKeyProfile[] = [];

// Ensure storage directory exists and load saved keys
function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(KEYS_FILE)) {
      const raw = fs.readFileSync(KEYS_FILE, 'utf-8');
      keyProfiles = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[KeyStore] Could not load saved keys from file, using in-memory store:', err);
    keyProfiles = [];
  }
}

// Save store to disk
function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keyProfiles, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[KeyStore] Failed to persist keys to disk:', err);
  }
}

initStore();

export function maskKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••' + trimmed.slice(-2);
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export function getAllProfiles(): SavedKeyProfile[] {
  return [...keyProfiles];
}

export function getMaskedProfiles(): MaskedKeyProfile[] {
  return keyProfiles.map((p) => ({
    id: p.id,
    provider: p.provider,
    label: p.label,
    maskedApiKey: maskKey(p.apiKey),
    hasApiKey: Boolean(p.apiKey && p.apiKey.trim().length > 0),
    baseUrl: p.baseUrl,
    defaultModel: p.defaultModel,
    enabled: p.enabled,
    isDefault: p.isDefault,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    lastTestStatus: p.lastTestStatus,
  }));
}

export function getProfileById(id: string): SavedKeyProfile | undefined {
  return keyProfiles.find((p) => p.id === id);
}

export function getActiveProfileForProvider(provider: ProviderId): SavedKeyProfile | undefined {
  const providerProfiles = keyProfiles.filter((p) => p.provider === provider && p.enabled);
  const defaultProf = providerProfiles.find((p) => p.isDefault);
  if (defaultProf) return defaultProf;
  return providerProfiles[0];
}

export function addProfile(data: {
  provider: ProviderId;
  label: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled?: boolean;
  isDefault?: boolean;
}): SavedKeyProfile {
  const newId = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // If setting as default, unmark other profiles for same provider
  if (data.isDefault) {
    keyProfiles.forEach((p) => {
      if (p.provider === data.provider) p.isDefault = false;
    });
  }

  const profile: SavedKeyProfile = {
    id: newId,
    provider: data.provider,
    label: data.label.trim() || `${data.provider.toUpperCase()} Key`,
    apiKey: data.apiKey.trim(),
    baseUrl: data.baseUrl?.trim(),
    defaultModel: data.defaultModel?.trim(),
    enabled: data.enabled !== false,
    isDefault: Boolean(data.isDefault),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  keyProfiles.push(profile);
  persistStore();
  return profile;
}

export function updateProfile(
  id: string,
  data: Partial<Pick<SavedKeyProfile, 'label' | 'apiKey' | 'baseUrl' | 'defaultModel' | 'enabled' | 'isDefault'>>
): SavedKeyProfile | undefined {
  const profile = keyProfiles.find((p) => p.id === id);
  if (!profile) return undefined;

  if (data.isDefault && profile.provider) {
    keyProfiles.forEach((p) => {
      if (p.provider === profile.provider) p.isDefault = false;
    });
  }

  if (data.label !== undefined) profile.label = data.label.trim();
  if (data.apiKey !== undefined && data.apiKey.trim().length > 0) profile.apiKey = data.apiKey.trim();
  if (data.baseUrl !== undefined) profile.baseUrl = data.baseUrl.trim();
  if (data.defaultModel !== undefined) profile.defaultModel = data.defaultModel.trim();
  if (data.enabled !== undefined) profile.enabled = data.enabled;
  if (data.isDefault !== undefined) profile.isDefault = data.isDefault;

  profile.updatedAt = Date.now();
  persistStore();
  return profile;
}

export function deleteProfile(id: string): boolean {
  const initialLen = keyProfiles.length;
  keyProfiles = keyProfiles.filter((p) => p.id !== id);
  const deleted = keyProfiles.length < initialLen;
  if (deleted) persistStore();
  return deleted;
}

export function setTestStatus(
  id: string,
  status: { ok: boolean; statusCode?: number; code?: string; message?: string; latencyMs?: number }
) {
  const profile = keyProfiles.find((p) => p.id === id);
  if (profile) {
    profile.lastTestStatus = { ...status, testedAt: Date.now() };
    persistStore();
  }
}
