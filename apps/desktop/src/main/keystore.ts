import { safeStorage } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import type { Keystore } from '@ai-hub/keystore';
import { app } from 'electron';

const STORE_PATH = join(app.getPath('userData'), 'keystore.enc.json');

function loadRaw(): Record<string, string> {
  if (!existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveRaw(data: Record<string, string>) {
  mkdirSync(join(app.getPath('userData')), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data), 'utf-8');
}

export class OsKeystore implements Keystore {
  async get(key: string): Promise<string | undefined> {
    const raw = loadRaw();
    if (!raw[key]) return undefined;
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw[key], 'base64'));
    }
    return Buffer.from(raw[key], 'base64').toString('utf-8');
  }

  async set(key: string, value: string): Promise<void> {
    const raw = loadRaw();
    if (safeStorage.isEncryptionAvailable()) {
      raw[key] = safeStorage.encryptString(value).toString('base64');
    } else {
      raw[key] = Buffer.from(value).toString('base64');
    }
    saveRaw(raw);
  }

  async delete(key: string): Promise<void> {
    const raw = loadRaw();
    delete raw[key];
    saveRaw(raw);
  }
}
