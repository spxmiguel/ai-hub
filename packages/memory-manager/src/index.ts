import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadConfig, saveConfig, AI_HUB_DIR, type MemoryMode, type HubConfig } from './config.js';

export { loadConfig, saveConfig, AI_HUB_DIR };
export type { MemoryMode, HubConfig };

export const MEMORY_PATH = join(homedir(), 'ai-hub', 'memory.md');
const MAX_LINES = 150;

const INITIAL_MEMORY = `# AI Hub Memory

## Profile
- Language: Portuguese (code in English)

## Preferences
- Token efficiency: max — caveman active by default
- UI: dark only, purple accent

## Projects
- ai-hub: unified AI interface (web + desktop)
`;

export async function readMemory(): Promise<string> {
  if (!existsSync(MEMORY_PATH)) {
    await mkdir(AI_HUB_DIR, { recursive: true });
    await writeFile(MEMORY_PATH, INITIAL_MEMORY, 'utf8');
    return INITIAL_MEMORY;
  }
  return readFile(MEMORY_PATH, 'utf8');
}

// Compact: keep the header block + most recent lines
function compact(content: string, maxLines: number): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;

  // Find where the first dated [MEMORY YYYY-MM-DD] section starts
  const firstEntryIdx = lines.findIndex(l => /^## \[MEMORY \d{4}-\d{2}-\d{2}\]/.test(l));
  const header = firstEntryIdx > 0 ? lines.slice(0, firstEntryIdx) : lines.slice(0, 10);
  const tail = lines.slice(-(maxLines - header.length));
  return [...header, ...tail].join('\n');
}

export async function appendMemory(block: string): Promise<void> {
  await mkdir(AI_HUB_DIR, { recursive: true });

  const cfg = await loadConfig();
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n## [MEMORY ${date}]\n${block.trim()}\n`;

  let current = existsSync(MEMORY_PATH) ? await readFile(MEMORY_PATH, 'utf8') : INITIAL_MEMORY;
  current += entry;

  if (cfg.autoCompact) {
    const threshold = Math.floor(MAX_LINES * (cfg.autoCompactThreshold ?? 0.8));
    const lineCount = current.split('\n').length;
    if (lineCount >= threshold) {
      current = compact(current, MAX_LINES);
    }
  }

  await writeFile(MEMORY_PATH, current, 'utf8');
}

// Save a full conversation turn (normal mode only)
export async function appendConversationTurn(
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  const cfg = await loadConfig();
  if (cfg.memoryMode !== 'normal') return;

  const date = new Date().toISOString().slice(0, 10);
  const block = `User: ${userMessage.slice(0, 200)}${userMessage.length > 200 ? '…' : ''}\nAssistant: ${assistantMessage.slice(0, 300)}${assistantMessage.length > 300 ? '…' : ''}`;
  await appendMemory(block);
}

// Scan AI response for [MEMORY]...[/MEMORY] tags and append them
export async function processMemoryBlocks(response: string): Promise<void> {
  const pattern = /\[MEMORY\]([\s\S]*?)\[\/MEMORY\]/g;
  const matches = [...response.matchAll(pattern)];
  for (const match of matches) {
    const block = match[1];
    if (block?.trim()) await appendMemory(block);
  }
}

// Force compact now regardless of threshold
export async function forceCompact(): Promise<void> {
  if (!existsSync(MEMORY_PATH)) return;
  const content = await readFile(MEMORY_PATH, 'utf8');
  const compacted = compact(content, MAX_LINES);
  await writeFile(MEMORY_PATH, compacted, 'utf8');
}

export async function getMemoryLineCount(): Promise<number> {
  if (!existsSync(MEMORY_PATH)) return 0;
  const content = await readFile(MEMORY_PATH, 'utf8');
  return content.split('\n').length;
}
