import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store';
import { composeSystemPrompt, BUILT_IN_SKILLS } from '@ai-hub/skills-registry';
import { createDesktopRegistry } from '@ai-hub/provider-core';
import MessageBubble from '../components/MessageBubble';
import SkillChips from '../components/SkillChips';
import ProviderSelector from '../components/ProviderSelector';
import { Send, Plus } from 'lucide-react';

declare global {
  interface Window {
    hub: {
      memory: {
        read(): Promise<string>;
        append(block: string): Promise<void>;
        appendTurn(user: string, assistant: string): Promise<void>;
        compact(): Promise<void>;
        lineCount(): Promise<number>;
      };
      keystore: {
        get(provider: string): Promise<string | undefined>;
        set(provider: string, value: string): Promise<void>;
        delete(provider: string): Promise<void>;
      };
      config: {
        load(): Promise<import('@ai-hub/memory-manager').HubConfig>;
        save(cfg: Partial<import('@ai-hub/memory-manager').HubConfig>): Promise<void>;
      };
      pty: {
        create(agent: string, cwd: string): Promise<string>;
        write(id: string, data: string): Promise<void>;
        resize(id: string, cols: number, rows: number): Promise<void>;
        destroy(id: string): Promise<void>;
        onData(cb: (id: string, data: string) => void): () => void;
      };
      webview: {
        status(provider: string): Promise<boolean>;
        login(provider: string): Promise<boolean>;
        chat(provider: string, message: string, convId: string): Promise<void>;
        logout(provider: string): Promise<void>;
        onChunk(cb: (convId: string, chunk: string) => void): () => void;
        onDone(cb: (convId: string) => void): () => void;
        onError(cb: (convId: string, msg: string) => void): () => void;
      };
    };
  }
}

const WEBVIEW_PROVIDERS = new Set(['chatgpt', 'gemini']);

export default function ChatView() {
  const {
    conversations, activeId, activeProvider, activeModel, activeSkills,
    isStreaming, newConversation, addMessage, appendToLastMessage, setStreaming,
    setActiveConversation,
  } = useChatStore();

  const conversation = conversations.find(c => c.id === activeId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Wire up webview IPC listeners once
  useEffect(() => {
    const offChunk = window.hub.webview.onChunk((convId, chunk) => {
      if (convId === activeConvIdRef.current) appendToLastMessage(convId, chunk);
    });
    const offDone = window.hub.webview.onDone((convId) => {
      if (convId === activeConvIdRef.current) setStreaming(false);
    });
    const offError = window.hub.webview.onError((convId, msg) => {
      if (convId === activeConvIdRef.current) {
        addMessage(convId, { role: 'assistant', content: `Error: ${msg}` });
        setStreaming(false);
      }
    });
    return () => { offChunk(); offDone(); offError(); };
  }, []);

  async function send() {
    if (!input.trim() || isStreaming) return;

    let convId = activeId;
    if (!convId) convId = newConversation(activeProvider, activeModel);

    const userMsg = { role: 'user' as const, content: input.trim() };
    addMessage(convId, userMsg);
    setInput('');
    setStreaming(true);
    activeConvIdRef.current = convId;

    // WebView path — ChatGPT / Gemini
    if (WEBVIEW_PROVIDERS.has(activeProvider)) {
      const connected = await window.hub.webview.status(activeProvider);
      if (!connected) {
        addMessage(convId, {
          role: 'assistant',
          content: `Não conectado ao ${activeProvider}. Vá em Configurações → Conectar.`,
        });
        setStreaming(false);
        return;
      }
      addMessage(convId, { role: 'assistant', content: '' });
      // fires async; IPC listeners above handle chunks/done/error
      window.hub.webview.chat(activeProvider, userMsg.content, convId);
      return;
    }

    // API path — Claude only
    try {
      const claudeKey = await window.hub.keystore.get('claude');
      const registry = createDesktopRegistry({ claude: claudeKey });

      const memory = await window.hub.memory.read();
      const systemPrompt = composeSystemPrompt({ memory, activeSkillIds: activeSkills });

      const conv = useChatStore.getState().conversations.find(c => c.id === convId)!;
      const messages = [{ role: 'system' as const, content: systemPrompt }, ...conv.messages];

      addMessage(convId, { role: 'assistant', content: '' });

      let fullResponse = '';
      for await (const chunk of registry.get(activeProvider)!.stream(messages, { model: activeModel })) {
        fullResponse += chunk;
        appendToLastMessage(convId, chunk);
      }

      const config = await window.hub.config.load();
      if (config.memoryMode === 'normal') {
        await window.hub.memory.appendTurn(userMsg.content, fullResponse.slice(0, 300));
      }

      const memMatch = fullResponse.match(/\[MEMORY\]([\s\S]*?)\[\/MEMORY\]/g);
      if (memMatch) {
        for (const block of memMatch) await window.hub.memory.append(block);
      }
    } catch (err) {
      addMessage(convId, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 drag-region">
        <div className="no-drag flex items-center gap-2 flex-1">
          <ProviderSelector />
          <button
            onClick={() => setActiveConversation(null)}
            className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="New conversation"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 selectable">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Start a conversation
          </div>
        ) : (
          conversation.messages
            .filter(m => m.role !== 'system')
            .map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Skills */}
      <div className="px-4 pt-2 shrink-0">
        <SkillChips skills={BUILT_IN_SKILLS} activeIds={activeSkills} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-40 selectable"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isStreaming}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
