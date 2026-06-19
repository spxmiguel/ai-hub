// High-level conversation sync on top of drive client.
// Conversations are stored as markdown files inside the "AI Hub/conversations/" folder.

import { findOrCreateFolder, uploadFile, downloadFile, listFiles } from './client.js';

export interface ConversationMeta {
  id: string;     // Drive file id
  title: string;  // filename without .md
  modifiedTime?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

function serializeConversation(title: string, messages: ConversationMessage[]): string {
  const lines = [`# ${title}`, '', `_Synced: ${new Date().toISOString()}_`, ''];
  for (const m of messages) {
    const ts = m.timestamp ? ` _(${m.timestamp})_` : '';
    lines.push(`## ${m.role}${ts}`, '', m.content, '');
  }
  return lines.join('\n');
}

export class ConversationSync {
  private accessToken: string;
  private rootFolderId: string | null = null;
  private convFolderId: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async ensureFolders(): Promise<string> {
    if (this.convFolderId) return this.convFolderId;
    this.rootFolderId = await findOrCreateFolder(this.accessToken, 'AI Hub');
    this.convFolderId = await findOrCreateFolder(
      this.accessToken,
      'conversations',
      this.rootFolderId,
    );
    return this.convFolderId;
  }

  async save(
    title: string,
    messages: ConversationMessage[],
    existingFileId?: string,
  ): Promise<string> {
    const folderId = await this.ensureFolders();
    const content = serializeConversation(title, messages);
    const filename = `${title.replace(/[^a-z0-9_\- ]/gi, '_')}.md`;
    return uploadFile(this.accessToken, folderId, filename, content, existingFileId);
  }

  async load(fileId: string): Promise<string> {
    return downloadFile(this.accessToken, fileId);
  }

  async list(pageToken?: string): Promise<{ conversations: ConversationMeta[]; nextPageToken?: string }> {
    const folderId = await this.ensureFolders();
    const result = await listFiles(this.accessToken, folderId, pageToken);
    return {
      conversations: result.files.map(f => ({
        id: f.id,
        title: f.name.replace(/\.md$/, ''),
        modifiedTime: f.modifiedTime,
      })),
      nextPageToken: result.nextPageToken,
    };
  }

  // Save memory.md to Drive root AI Hub folder
  async syncMemory(content: string, existingFileId?: string): Promise<string> {
    const folderId = await this.ensureFolders();
    return uploadFile(this.accessToken, this.rootFolderId!, 'memory.md', content, existingFileId);
  }
}
