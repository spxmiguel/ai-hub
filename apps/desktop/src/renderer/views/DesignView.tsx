import { useState } from 'react';
import { Palette, ExternalLink } from 'lucide-react';

const TOOLS = [
  {
    id: 'claude-design',
    label: 'Claude + Design',
    description: 'Chat with Claude using the design skill',
    action: 'internal',
  },
  {
    id: 'stitch',
    label: 'Google Stitch',
    description: 'UI prototyping with Google Stitch',
    action: 'https://stitch.withgoogle.com',
  },
  {
    id: 'penpot',
    label: 'Penpot',
    description: 'Open-source design tool',
    action: 'https://penpot.app',
  },
  {
    id: 'excalidraw',
    label: 'Excalidraw',
    description: 'Hand-drawn style diagrams',
    action: 'https://excalidraw.com',
  },
];

export default function DesignView() {
  const [selected, setSelected] = useState<string | null>(null);

  function open(tool: typeof TOOLS[0]) {
    if (tool.action === 'internal') {
      setSelected(tool.id);
    } else {
      window.open(tool.action, '_blank');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border drag-region">
        <div className="no-drag flex items-center gap-2">
          <Palette size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Design</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => open(tool)}
              className="flex flex-col gap-2 p-5 bg-card border border-border rounded-xl text-left hover:border-primary/50 hover:bg-card/80 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{tool.label}</span>
                {tool.action !== 'internal' && (
                  <ExternalLink size={13} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
