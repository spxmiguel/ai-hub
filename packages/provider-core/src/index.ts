export type { Message, ModelDefinition, ChatOptions, AIProvider, ProviderRegistry } from './types.js';
export { ClaudeProvider } from './providers/claude.js';
export { OpenAIProvider } from './providers/openai.js';
export { GeminiProvider } from './providers/gemini.js';
export { OllamaProvider } from './providers/ollama.js';
export { CLIProvider } from './providers/cli.js';
export { DefaultProviderRegistry } from './registry.js';

import { ClaudeProvider } from './providers/claude.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
import { CLIProvider } from './providers/cli.js';
import { DefaultProviderRegistry } from './registry.js';
import type { ProviderRegistry } from './types.js';

interface WebKeys {
  claude?: string;
  openai?: string;
  gemini?: string;
}

export function createWebRegistry(keys: WebKeys): ProviderRegistry {
  const reg = new DefaultProviderRegistry();
  if (keys.claude) reg.register(new ClaudeProvider(keys.claude));
  if (keys.openai) reg.register(new OpenAIProvider(keys.openai));
  if (keys.gemini) reg.register(new GeminiProvider(keys.gemini));
  return reg;
}

interface DesktopKeys extends WebKeys {
  ollamaBaseUrl?: string;
}

export function createDesktopRegistry(keys: DesktopKeys): ProviderRegistry {
  const reg = new DefaultProviderRegistry();
  if (keys.claude) reg.register(new ClaudeProvider(keys.claude));
  if (keys.openai) reg.register(new OpenAIProvider(keys.openai));
  if (keys.gemini) reg.register(new GeminiProvider(keys.gemini));
  reg.register(new OllamaProvider(keys.ollamaBaseUrl));
  reg.register(new CLIProvider());
  return reg;
}
