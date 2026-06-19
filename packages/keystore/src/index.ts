// Keystore abstraction — env vars (web/CI), memory (tests), or Tauri Stronghold (desktop).
// Desktop overrides this by injecting a TauriKeystore via setKeystore().

export interface Keystore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// In-memory fallback (tests, SSR route handlers that receive keys from session)
export class MemoryKeystore implements Keystore {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Environment variable keystore (Next.js server-side only)
export class EnvKeystore implements Keystore {
  async get(key: string): Promise<string | undefined> {
    return process.env[key];
  }

  async set(_key: string, _value: string): Promise<void> {
    throw new Error('EnvKeystore is read-only');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('EnvKeystore is read-only');
  }
}

let _keystore: Keystore = new MemoryKeystore();

export function setKeystore(ks: Keystore): void {
  _keystore = ks;
}

export function getKeystore(): Keystore {
  return _keystore;
}

// Convenience helpers for AI provider keys
export const PROVIDER_KEYS = {
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const;

export async function getProviderKey(provider: keyof typeof PROVIDER_KEYS): Promise<string | undefined> {
  return _keystore.get(PROVIDER_KEYS[provider]);
}

export async function setProviderKey(provider: keyof typeof PROVIDER_KEYS, value: string): Promise<void> {
  return _keystore.set(PROVIDER_KEYS[provider], value);
}

export async function deleteProviderKey(provider: keyof typeof PROVIDER_KEYS): Promise<void> {
  return _keystore.delete(PROVIDER_KEYS[provider]);
}
