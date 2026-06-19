import type { View } from '../App';
import { MessageSquare, Code2, Palette, History, Settings } from 'lucide-react';

const NAV: { id: View; icon: React.ElementType; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'code', icon: Code2, label: 'Code' },
  { id: 'design', icon: Palette, label: 'Design' },
  { id: 'history', icon: History, label: 'History' },
];

interface SidebarProps {
  active: View;
  onNavigate: (v: View) => void;
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col items-center w-14 h-screen bg-card border-r border-border py-2 gap-1 shrink-0">
      {/* Traffic lights spacer on Mac */}
      <div className="h-8 w-full drag-region" />

      <div className="flex flex-col gap-1 flex-1 w-full px-1">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            title={label}
            className={`
              flex items-center justify-center w-full aspect-square rounded-lg transition-colors
              ${active === id
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }
            `}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      <button
        onClick={() => onNavigate('settings')}
        title="Settings"
        className={`
          flex items-center justify-center w-10 aspect-square rounded-lg transition-colors mb-2
          ${active === 'settings'
            ? 'bg-primary/20 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }
        `}
      >
        <Settings size={18} />
      </button>
    </aside>
  );
}
