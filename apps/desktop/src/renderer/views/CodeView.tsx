import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TermIcon } from 'lucide-react';

const AGENTS = [
  { id: 'claude-cli', label: 'claude', description: 'Claude Code CLI' },
  { id: 'antigravity', label: 'antigravity', description: 'Antigravity AI' },
  { id: 'codex', label: 'codex', description: 'OpenAI Codex' },
];

export default function CodeView() {
  const termRef = useRef<HTMLDivElement>(null);
  const [ptyId, setPtyId] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState('claude-cli');
  const xtermRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        cursor: '#a855f7',
        selectionBackground: '#a855f740',
      },
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();

    xtermRef.current = term;
    fitRef.current = fit;

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
    };
  }, []);

  async function launchAgent(agentId: string) {
    if (ptyId) {
      await window.hub.pty.destroy(ptyId);
      setPtyId(null);
    }

    xtermRef.current?.clear();
    const id = await window.hub.pty.create(agentId, process.env.HOME ?? '~');
    setPtyId(id);

    const term = xtermRef.current!;
    term.onData(data => window.hub.pty.write(id, data));

    const off = window.hub.pty.onData((ptId, data) => {
      if (ptId === id) term.write(data);
    });

    if (fitRef.current) {
      const { cols, rows } = fitRef.current.proposeDimensions() ?? { cols: 120, rows: 40 };
      await window.hub.pty.resize(id, cols, rows);
    }

    return off;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 drag-region">
        <div className="no-drag flex items-center gap-2">
          <TermIcon size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Terminal</span>
          <div className="flex gap-1 ml-2">
            {AGENTS.map(a => (
              <button
                key={a.id}
                onClick={() => {
                  setActiveAgent(a.id);
                  launchAgent(a.id);
                }}
                title={a.description}
                className={`
                  px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                  ${activeAgent === a.id && ptyId
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'
                  }
                `}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        {!ptyId && (
          <button
            onClick={() => launchAgent(activeAgent)}
            className="ml-auto no-drag px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium"
          >
            Launch
          </button>
        )}
      </div>

      {/* Terminal */}
      <div ref={termRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
}
