import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const AI_HUB_DIR = join(homedir(), 'ai-hub');
export const CONFIG_PATH = join(AI_HUB_DIR, 'config.json');

export type MemoryMode = 'lite' | 'normal';

export interface HubConfig {
  memoryMode: MemoryMode;
  autoCompact: boolean;
  // 0–1: fraction of MAX_LINES that triggers compact
  autoCompactThreshold: number;
  driveSync: {
    enabled: boolean;
    folderId: string | null;
  };
}

const DEFAULTS: HubConfig = {
  memoryMode: 'lite',
  autoCompact: true,
  autoCompactThreshold: 0.8,
  driveSync: { enabled: false, folderId: null },
};

export async function loadConfig(): Promise<HubConfig> {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) } as HubConfig;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveConfig(cfg: Partial<HubConfig>): Promise<void> {
  await mkdir(AI_HUB_DIR, { recursive: true });
  const current = await loadConfig();
  const next = { ...current, ...cfg };
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
}
