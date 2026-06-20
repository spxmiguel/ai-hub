import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ChatOptions, Message, ModelDefinition } from '../types.js';

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude';
  readonly name = 'Claude';
  readonly models: ModelDefinition[] = [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200000, supportsStreaming: true },
    { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', contextWindow: 200000, supportsStreaming: true },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200000, supportsStreaming: true },
  ];

  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
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
    const system = opts.systemPrompt;
    const userMessages = messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 8192,
      ...(system !== undefined && { system }),
      messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
