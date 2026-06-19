import type { AIProvider, ProviderRegistry } from './types.js';

export class DefaultProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, AIProvider>();

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  listAll(): AIProvider[] {
    return [...this.providers.values()];
  }

  async listAvailable(): Promise<AIProvider[]> {
    const results = await Promise.all(
      [...this.providers.values()].map(async p => ({ p, ok: await p.isAvailable() }))
    );
    return results.filter(r => r.ok).map(r => r.p);
  }
}
