'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { composeSystemPrompt, BUILT_IN_SKILLS } from '@ai-hub/skills-registry';
import MessageBubble from '@/components/MessageBubble';
import ProviderSelector from '@/components/ProviderSelector';
import { Send, Terminal, Monitor } from 'lucide-react';

const CODE_SKILL_ID = 'code-mode';

export default function CodePage() {
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

  // Force code skill active on mount
  useEffect(() => {
    if (!activeSkills.includes(CODE_SKILL_ID)) toggleSkill(CODE_SKILL_ID);
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

    const userMsg = { role: 'user' as const, content: input.trim() };
    addMessage(convId, userMsg);
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

      const skills = activeSkills.includes(CODE_SKILL_ID)
        ? activeSkills
        : [...activeSkills, CODE_SKILL_ID];
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
        <Terminal size={15} className="text-primary" />
        <span className="text-sm font-medium text-foreground">Code</span>
        <span className="ml-auto text-xs text-muted-foreground">skill Code ativo</span>
      </div>

      {/* Desktop terminal banner */}
      {!hasMessages && (
        <div className="shrink-0 mx-4 mt-4 flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
          <Monitor size={15} className="text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Terminal real (Claude CLI, Codex) disponível no{' '}
            <span className="text-foreground">app desktop</span>. Aqui: IA focada em código.
          </p>
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
          {!hasActiveKey ? (
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <p className="text-sm text-muted-foreground">
                Chave para <span className="text-foreground font-medium capitalize">{activeProvider}</span> não configurada.
              </p>
              <Link href="/settings" className="text-xs text-primary hover:underline">
                Configurar em Settings
              </Link>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-foreground">
              Modo código ativo.
            </h1>
          )}
        </div>
      )}

      {/* Input */}
      <div className={`shrink-0 px-4 pb-6 ${!hasMessages ? 'pb-32' : 'pt-2'}`}>
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 px-4 py-3 focus-within:border-white/20 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Peça código, review, debug..."
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-48 font-mono"
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
