import { create } from 'zustand';
import type { Message } from '@ai-hub/provider-core';
import type { HubConfig } from '@ai-hub/memory-manager';

export interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  activeProvider: string;
  activeModel: string;
  activeSkills: string[];
  isStreaming: boolean;

  setActiveConversation: (id: string | null) => void;
  setProvider: (id: string) => void;
  setModel: (id: string) => void;
  toggleSkill: (id: string) => void;
  addMessage: (convId: string, msg: Message) => void;
  appendToLastMessage: (convId: string, chunk: string) => void;
  setStreaming: (v: boolean) => void;
  newConversation: (provider: string, model: string) => string;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  activeProvider: 'claude',
  activeModel: 'claude-opus-4-5',
  activeSkills: ['caveman'],
  isStreaming: false,

  setActiveConversation: id => set({ activeId: id }),
  setProvider: id => set({ activeProvider: id }),
  setModel: id => set({ activeModel: id }),
  toggleSkill: id =>
    set(s => ({
      activeSkills: s.activeSkills.includes(id)
        ? s.activeSkills.filter(x => x !== id)
        : [...s.activeSkills, id],
    })),
  addMessage: (convId, msg) =>
    set(s => ({
      conversations: s.conversations.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() }
          : c
      ),
    })),
  appendToLastMessage: (convId, chunk) =>
    set(s => ({
      conversations: s.conversations.map(c => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
        }
        return { ...c, messages: msgs };
      }),
    })),
  setStreaming: v => set({ isStreaming: v }),
  newConversation: (provider, model) => {
    const id = uid();
    set(s => ({
      conversations: [
        ...s.conversations,
        {
          id,
          title: 'New conversation',
          provider,
          model,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeId: id,
    }));
    return id;
  },
}));

interface ConfigState {
  config: HubConfig | null;
  setConfig: (c: HubConfig) => void;
}

export const useConfigStore = create<ConfigState>(set => ({
  config: null,
  setConfig: config => set({ config }),
}));
