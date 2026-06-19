import { useChatStore } from '../store';
import { MessageSquare, Trash2 } from 'lucide-react';

export default function HistoryView() {
  const { conversations, setActiveConversation } = useChatStore();

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  if (!sorted.length) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm gap-2">
        <MessageSquare size={32} className="opacity-30" />
        <p>No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border drag-region">
        <span className="no-drag text-sm font-medium">History</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sorted.map(conv => (
          <button
            key={conv.id}
            onClick={() => setActiveConversation(conv.id)}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left group"
          >
            <MessageSquare size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{conv.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conv.provider} · {new Date(conv.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
