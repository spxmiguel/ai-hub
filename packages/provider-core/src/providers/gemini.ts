import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, ChatOptions, Message, ModelDefinition } from '../types.js';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Gemini';
  readonly models: ModelDefinition[] = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1048576, supportsStreaming: true },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576, supportsStreaming: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, supportsStreaming: true },
  ];

  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });
      await model.generateContent('ping');
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
    const model = this.client.getGenerativeModel({
      model: opts.model,
      systemInstruction: opts.systemPrompt,
    });

    const history = messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages.filter(m => m.role !== 'system').at(-1);
    if (!lastMessage) return;

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
