'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Search, Settings, MessageSquare, Terminal, Palette } from 'lucide-react';
import { useChatStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/cn';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { conversations, activeId, setActiveConversation } = useChatStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = conversations
    .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 flex flex-col bg-[#0d0d0d] shrink-0">
        {/* Logo */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary shrink-0" />
          <span className="font-semibold text-sm text-foreground">AI Hub</span>
        </div>

        {/* New chat */}
        <div className="px-2 py-1">
          <Link
            href="/chat"
            onClick={() => setActiveConversation(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <Plus size={16} />
            Novo chat
          </Link>
        </div>

        {/* Search */}
        <div className="px-2 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 text-muted-foreground text-sm cursor-text transition-colors">
            <Search size={14} className="shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar chats"
              className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground w-full text-xs"
            />
          </div>
        </div>

        {/* Mode nav */}
        <div className="px-2 pb-1">
          <Link
            href="/code"
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              path === '/code'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <Terminal size={15} />
            <span className="text-xs">Code</span>
          </Link>
          <Link
            href="/design"
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              path === '/design'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <Palette size={15} />
            <span className="text-xs">Design</span>
          </Link>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-3">
              {search ? 'Nenhum resultado' : 'Nenhum chat ainda'}
            </p>
          )}
          {filtered.map(c => (
            <Link
              key={c.id}
              href="/chat"
              onClick={() => setActiveConversation(c.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer w-full',
                c.id === activeId
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <MessageSquare size={13} className="shrink-0 opacity-50" />
              <span className="truncate text-xs">{c.title}</span>
            </Link>
          ))}
        </div>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-white/5">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              path === '/settings'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            )}
          >
            <Settings size={15} />
            <span className="text-xs">Configurações</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
