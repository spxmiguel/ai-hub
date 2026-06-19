'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { composeSystemPrompt, BUILT_IN_SKILLS } from '@ai-hub/skills-registry';
import MessageBubble from '@/components/MessageBubble';
import SkillChips from '@/components/SkillChips';
import ProviderSelector from '@/components/ProviderSelector';
import { Send, Plus } from 'lucide-react';

export default function ChatPage() {
  const { googleToken } = useAuth();
  const {
    conversations,
    activeId,
    activeProvider,
    activeModel,
    activeSkills,
    isStreaming,
    newConversation,
    addMessage,
    appendToLastMessage,
    setStreaming,
    toggleSkill,
  } = useChatStore();

  const conversation = conversations.find(c => c.id === activeId);
  const messages = conversation?.messages.filter(m => m.role !== 'system') ?? [];
  const hasMessages = messages.length > 0;

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  async function send() {
    if (!input.trim() || isStreaming) return;

    let convId = activeId;
    if (!convId) {
      convId = newConversation(activeProvider, activeModel);
    }

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
      } catch {
        // memory unavailable
      }

      const systemPrompt = composeSystemPrompt({ memory, activeSkillIds: activeSkills });
      const conv = useChatStore.getState().conversations.find(c => c.id === convId)!;
      const msgs = [{ role: 'system' as const, content: systemPrompt }, ...conv.messages];

      addMessage(convId, { role: 'assistant', content: '' });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      {/* Messages or empty state */}
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
          <h1 className="text-2xl font-semibold text-foreground mb-8">
            Pronto quando você quiser.
          </h1>
        </div>
      )}

      {/* Input area */}
      <div className={`shrink-0 px-4 pb-6 ${!hasMessages ? 'pb-32' : 'pt-2'}`}>
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Input box */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 px-4 py-3 focus-within:border-white/20 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pergunte qualquer coisa"
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-48"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="Anexar"
                >
                  <Plus size={14} />
                </button>
                <ProviderSelector />
              </div>
              <button
                onClick={send}
                disabled={!input.trim() || isStreaming}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white disabled:bg-white/10 text-black disabled:text-muted-foreground transition-colors disabled:cursor-not-allowed"
              >
                <Send size={13} />
              </button>
            </div>
          </div>

          {/* Skill chips */}
          <SkillChips skills={BUILT_IN_SKILLS} activeIds={activeSkills} onToggle={toggleSkill} />
        </div>
      </div>
    </div>
  );
}
