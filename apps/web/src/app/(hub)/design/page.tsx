'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { composeSystemPrompt } from '@ai-hub/skills-registry';
import MessageBubble from '@/components/MessageBubble';
import ProviderSelector from '@/components/ProviderSelector';
import { Send, Palette, ExternalLink } from 'lucide-react';

const DESIGN_SKILL_ID = 'ui-ux-pro-max';

const TOOLS = [
  {
    name: 'Google Stitch',
    description: 'Protótipos com IA do Google',
    color: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
    dot: 'bg-blue-500',
    url: 'https://stitch.withgoogle.com',
  },
  {
    name: 'Penpot',
    description: 'Design open-source colaborativo',
    color: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
    dot: 'bg-violet-500',
    url: 'https://penpot.app',
  },
  {
    name: 'Excalidraw',
    description: 'Sketches e diagramas rápidos',
    color: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
    dot: 'bg-amber-500',
    url: 'https://excalidraw.com',
  },
];

export default function DesignPage() {
  const { googleToken } = useAuth();
  const {
    conversations,
    activeId,
    activeProvider,
    activeModel,
    activeSkills,
    apiKeys,
    isStreaming,
    newConversation,
    addMessage,
    appendToLastMessage,
    setStreaming,
    toggleSkill,
  } = useChatStore();

  useEffect(() => {
    if (!activeSkills.includes(DESIGN_SKILL_ID)) toggleSkill(DESIGN_SKILL_ID);
  }, []);

  const conversation = conversations.find(c => c.id === activeId);
  const messages = conversation?.messages.filter(m => m.role !== 'system') ?? [];
  const hasMessages = messages.length > 0;

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  const providerKeyMap: Record<string, keyof typeof apiKeys> = {
    claude: 'anthropic',
    openai: 'openai',
    gemini: 'gemini',
  };
  const activeKeyField = providerKeyMap[activeProvider];
  const hasActiveKey = activeKeyField ? !!apiKeys[activeKeyField] : false;

  async function send() {
    if (!input.trim() || isStreaming || !hasActiveKey) return;

    let convId = activeId;
    if (!convId) convId = newConversation(activeProvider, activeModel);

    addMessage(convId, { role: 'user', content: input.trim() });
    setInput('');
    setStreaming(true);

    try {
      let memory = '';
      try {
        const memHeaders: Record<string, string> = {};
        if (googleToken) memHeaders['Authorization'] = `Bearer ${googleToken}`;
        const memRes = await fetch('/api/memory', { headers: memHeaders });
        if (memRes.ok) memory = await memRes.text();
      } catch {}

      const skills = activeSkills.includes(DESIGN_SKILL_ID)
        ? activeSkills
        : [...activeSkills, DESIGN_SKILL_ID];
      const systemPrompt = composeSystemPrompt({ memory, activeSkillIds: skills });
      const conv = useChatStore.getState().conversations.find(c => c.id === convId)!;
      const msgs = [{ role: 'system' as const, content: systemPrompt }, ...conv.messages];

      addMessage(convId, { role: 'assistant', content: '' });

      const chatHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKeys.anthropic) chatHeaders['X-Anthropic-Key'] = apiKeys.anthropic;
      if (apiKeys.openai) chatHeaders['X-OpenAI-Key'] = apiKeys.openai;
      if (apiKeys.gemini) chatHeaders['X-Gemini-Key'] = apiKeys.gemini;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify({ provider: activeProvider, model: activeModel, messages: msgs }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        appendToLastMessage(convId, chunk);
      }

      const memMatch = fullResponse.match(/\[MEMORY\]([\s\S]*?)\[\/MEMORY\]/g);
      if (memMatch) {
        const memHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (googleToken) memHeaders['Authorization'] = `Bearer ${googleToken}`;
        for (const block of memMatch) {
          await fetch('/api/memory', {
            method: 'POST',
            headers: memHeaders,
            body: JSON.stringify({ block }),
          });
        }
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
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-white/5 flex items-center gap-2">
        <Palette size={15} className="text-primary" />
        <span className="text-sm font-medium text-foreground">Design</span>
        <span className="ml-auto text-xs text-muted-foreground">skill UI/UX ativo</span>
      </div>

      {/* Tool cards — always visible */}
      {!hasMessages && (
        <div className="shrink-0 px-6 pt-6">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Ferramentas</p>
          <div className="grid grid-cols-3 gap-3">
            {TOOLS.map(t => (
              <button
                key={t.name}
                onClick={() => window.open(t.url, '_blank', 'noopener')}
                className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-colors ${t.color}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                  <ExternalLink size={11} className="text-muted-foreground ml-auto" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">IA de Design</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {hasMessages ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <span className="text-sm text-muted-foreground animate-pulse">...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {!hasActiveKey && (
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <p className="text-sm text-muted-foreground">
                Chave para <span className="text-foreground font-medium capitalize">{activeProvider}</span> não configurada.
              </p>
              <Link href="/settings" className="text-xs text-primary hover:underline">
                Configurar em Settings
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className={`shrink-0 px-4 pb-6 ${!hasMessages ? '' : 'pt-2'}`}>
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 px-4 py-3 focus-within:border-white/20 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Peça design, componentes, sistemas visuais..."
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-48"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <div className="flex items-center justify-between mt-2">
              <ProviderSelector />
              <button
                onClick={send}
                disabled={!input.trim() || isStreaming || !hasActiveKey}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white disabled:bg-white/10 text-black disabled:text-muted-foreground transition-colors disabled:cursor-not-allowed"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
          {!hasActiveKey && (
            <p className="text-xs text-center text-muted-foreground">
              Chave para <span className="capitalize font-medium text-foreground">{activeProvider}</span> não configurada.{' '}
              <Link href="/settings" className="text-primary hover:underline">Configurar</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
