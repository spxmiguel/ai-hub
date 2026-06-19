import type { AIProvider, ChatOptions, Message, ModelDefinition } from '../types.js';

interface OllamaModel {
  name: string;
  details?: { parameter_size?: string };
}

interface OllamaChunk {
  message?: { content?: string };
  done: boolean;
}

export class OllamaProvider implements AIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  models: ModelDefinition[] = [];

  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return false;
      const data = (await res.json()) as { models: OllamaModel[] };
      this.models = (data.models ?? []).map(m => ({
        id: m.name,
        name: m.name,
        contextWindow: 8192,
        supportsStreaming: true,
      }));
      return true;
    } catch {
      return false;
    }
  }

  async send(messages: Message[], opts: ChatOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.stream(messages, opts)) {
      chunks.push(chunk);
    }
    return chunks.join('');
  }

  async *stream(messages: Message[], opts: ChatOptions): AsyncIterable<string> {
    const allMessages: { role: string; content: string }[] = [];

    if (opts.systemPrompt) {
      allMessages.push({ role: 'system', content: opts.systemPrompt });
    }
    for (const m of messages.filter(msg => msg.role !== 'system')) {
      allMessages.push({ role: m.role, content: m.content });
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        messages: allMessages,
        stream: true,
        options: {
          temperature: opts.temperature,
          num_predict: opts.maxTokens,
        },
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as OllamaChunk;
          const text = chunk.message?.content;
          if (text) yield text;
          if (chunk.done) return;
        } catch {
          // malformed line — skip
        }
      }
    }
  }
}
