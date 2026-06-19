import type { AIProvider, ChatOptions, Message, ModelDefinition } from '../types.js';

// Desktop-only stub. Real impl lives in apps/desktop via Tauri PTY commands.
// Web builds import this but isAvailable() always returns false.

export class CLIProvider implements AIProvider {
  readonly id = 'cli';
  readonly name = 'CLI Agents';
  readonly models: ModelDefinition[] = [
    { id: 'claude-cli', name: 'Claude (CLI)', contextWindow: 200000, supportsStreaming: true },
    { id: 'antigravity', name: 'Antigravity / Gemini CLI', contextWindow: 128000, supportsStreaming: true },
    { id: 'codex', name: 'Codex CLI', contextWindow: 128000, supportsStreaming: true },
  ];

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async send(_messages: Message[], _opts: ChatOptions): Promise<string> {
    throw new Error('CLIProvider: use CodeView terminal in desktop app');
  }

  // eslint-disable-next-line require-yield
  async *stream(_messages: Message[], _opts: ChatOptions): AsyncIterable<string> {
    throw new Error('CLIProvider: use CodeView terminal in desktop app');
  }
}
