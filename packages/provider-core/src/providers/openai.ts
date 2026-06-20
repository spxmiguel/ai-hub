import OpenAI from 'openai';
import type { AIProvider, ChatOptions, Message, ModelDefinition } from '../types.js';

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'ChatGPT';
  readonly models: ModelDefinition[] = [
    { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, supportsStreaming: true },
    { id: 'gpt-4.5-preview', name: 'GPT-4.5', contextWindow: 128000, supportsStreaming: true },
    { id: 'o3', name: 'o3', contextWindow: 200000, supportsStreaming: true },
    { id: 'o4-mini', name: 'o4-mini', contextWindow: 200000, supportsStreaming: true },
  ];

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
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
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (opts.systemPrompt) {
      allMessages.push({ role: 'system', content: opts.systemPrompt });
    }
    for (const m of messages.filter(msg => msg.role !== 'system')) {
      allMessages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }

    const stream = await this.client.chat.completions.create({
      model: opts.model,
      messages: allMessages,
      max_tokens: opts.maxTokens ?? null,
      temperature: opts.temperature ?? null,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
