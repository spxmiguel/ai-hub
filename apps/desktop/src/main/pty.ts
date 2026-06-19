import * as pty from 'node-pty';
import { randomUUID } from 'crypto';

type DataCallback = (id: string, data: string) => void;

const CLI_MAP: Record<string, string> = {
  'claude-cli': 'claude',
  antigravity: 'antigravity',
  codex: 'codex',
};

class PtyManager {
  private sessions = new Map<string, pty.IPty>();
  private dataCallbacks: DataCallback[] = [];

  create(agent: string, cwd: string): string {
    const id = randomUUID();
    const cmd = CLI_MAP[agent] ?? agent;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';

    const proc = pty.spawn(shell, ['-c', cmd], {
      name: 'xterm-color',
      cols: 120,
      rows: 40,
      cwd,
      env: { ...process.env } as Record<string, string>,
    });

    proc.onData(data => {
      this.dataCallbacks.forEach(cb => cb(id, data));
    });

    proc.onExit(() => this.sessions.delete(id));
    this.sessions.set(id, proc);
    return id;
  }

  write(id: string, data: string) {
    this.sessions.get(id)?.write(data);
  }

  resize(id: string, cols: number, rows: number) {
    this.sessions.get(id)?.resize(cols, rows);
  }

  destroy(id: string) {
    this.sessions.get(id)?.kill();
    this.sessions.delete(id);
  }

  onData(cb: DataCallback) {
    this.dataCallbacks.push(cb);
  }
}

export const ptyManager = new PtyManager();
