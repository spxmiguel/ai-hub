import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { readMemory, appendMemory, appendConversationTurn, forceCompact, getMemoryLineCount, loadConfig, saveConfig } from '@ai-hub/memory-manager';
import { setKeystore, getProviderKey, setProviderKey, deleteProviderKey } from '@ai-hub/keystore';
import { OsKeystore } from './keystore';
import { ptyManager } from './pty';
import { startCompanion } from './companion';
import { isConnected, openLoginWindow, webviewChat, disconnectProvider, WebViewProvider } from './webview';

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  setKeystore(new OsKeystore());
  startCompanion();
  registerIpcHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpcHandlers() {
  // Memory
  ipcMain.handle('memory:read', () => readMemory());
  ipcMain.handle('memory:append', (_e, block: string) => appendMemory(block));
  ipcMain.handle('memory:appendTurn', (_e, user: string, assistant: string) =>
    appendConversationTurn(user, assistant)
  );
  ipcMain.handle('memory:compact', () => forceCompact());
  ipcMain.handle('memory:lineCount', () => getMemoryLineCount());

  // Config
  ipcMain.handle('config:load', () => loadConfig());
  ipcMain.handle('config:save', (_e, cfg) => saveConfig(cfg));

  // Keystore
  ipcMain.handle('keystore:get', (_e, provider: string) => getProviderKey(provider as any));
  ipcMain.handle('keystore:set', (_e, provider: string, value: string) =>
    setProviderKey(provider as any, value)
  );
  ipcMain.handle('keystore:delete', (_e, provider: string) => deleteProviderKey(provider as any));

  // PTY (terminal for Code view)
  ipcMain.handle('pty:create', (_e, agent: string, cwd: string) =>
    ptyManager.create(agent, cwd)
  );
  ipcMain.handle('pty:write', (_e, id: string, data: string) => ptyManager.write(id, data));
  ipcMain.handle('pty:resize', (_e, id: string, cols: number, rows: number) =>
    ptyManager.resize(id, cols, rows)
  );
  ipcMain.handle('pty:destroy', (_e, id: string) => ptyManager.destroy(id));

  // PTY data forwarded to renderer
  ptyManager.onData((id, data) => {
    BrowserWindow.getAllWindows().forEach(w =>
      w.webContents.send('pty:data', id, data)
    );
  });

  // WebView (ChatGPT / Gemini via session injection)
  ipcMain.handle('webview:status', (_e, provider: WebViewProvider) => isConnected(provider));

  ipcMain.handle('webview:login', (_e, provider: WebViewProvider) => openLoginWindow(provider));

  ipcMain.handle('webview:chat', (e, provider: WebViewProvider, message: string, convId: string) =>
    webviewChat(provider, message, e.sender, convId)
  );

  ipcMain.handle('webview:logout', (_e, provider: WebViewProvider) => disconnectProvider(provider));
}
