export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModelDefinition {
  id: string;
  name: string;
  contextWindow: number;
  supportsStreaming: boolean;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  onToken?: (token: string) => void;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly models: ModelDefinition[];
  isAvailable(): Promise<boolean>;
  send(messages: Message[], opts: ChatOptions): Promise<string>;
  stream(messages: Message[], opts: ChatOptions): AsyncIterable<string>;
}

export interface ProviderRegistry {
  register(provider: AIProvider): void;
  get(id: string): AIProvider | undefined;
  listAll(): AIProvider[];
  listAvailable(): Promise<AIProvider[]>;
}
