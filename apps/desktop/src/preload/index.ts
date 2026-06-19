import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hub', {
  memory: {
    read: () => ipcRenderer.invoke('memory:read'),
    append: (block: string) => ipcRenderer.invoke('memory:append', block),
    appendTurn: (user: string, assistant: string) =>
      ipcRenderer.invoke('memory:appendTurn', user, assistant),
    compact: () => ipcRenderer.invoke('memory:compact'),
    lineCount: () => ipcRenderer.invoke('memory:lineCount'),
  },
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (cfg: unknown) => ipcRenderer.invoke('config:save', cfg),
  },
  keystore: {
    get: (provider: string) => ipcRenderer.invoke('keystore:get', provider),
    set: (provider: string, value: string) => ipcRenderer.invoke('keystore:set', provider, value),
    delete: (provider: string) => ipcRenderer.invoke('keystore:delete', provider),
  },
  pty: {
    create: (agent: string, cwd: string) => ipcRenderer.invoke('pty:create', agent, cwd),
    write: (id: string, data: string) => ipcRenderer.invoke('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke('pty:resize', id, cols, rows),
    destroy: (id: string) => ipcRenderer.invoke('pty:destroy', id),
    onData: (cb: (id: string, data: string) => void) => {
      ipcRenderer.on('pty:data', (_e, id, data) => cb(id, data));
      return () => ipcRenderer.removeAllListeners('pty:data');
    },
  },
  webview: {
    status: (provider: string) => ipcRenderer.invoke('webview:status', provider),
    login: (provider: string) => ipcRenderer.invoke('webview:login', provider),
    chat: (provider: string, message: string, convId: string) =>
      ipcRenderer.invoke('webview:chat', provider, message, convId),
    logout: (provider: string) => ipcRenderer.invoke('webview:logout', provider),
    onChunk: (cb: (convId: string, chunk: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, convId: string, chunk: string) => cb(convId, chunk);
      ipcRenderer.on('webview:chunk', handler);
      return () => ipcRenderer.removeListener('webview:chunk', handler);
    },
    onDone: (cb: (convId: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, convId: string) => cb(convId);
      ipcRenderer.on('webview:done', handler);
      return () => ipcRenderer.removeListener('webview:done', handler);
    },
    onError: (cb: (convId: string, msg: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, convId: string, msg: string) => cb(convId, msg);
      ipcRenderer.on('webview:error', handler);
      return () => ipcRenderer.removeListener('webview:error', handler);
    },
  },
});
