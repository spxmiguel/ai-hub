import { BrowserWindow, session, WebContents } from 'electron';

export type WebViewProvider = 'chatgpt' | 'gemini';

interface ProviderConfig {
  loginUrl: string;
  chatUrl: string;
  newChatUrl: string;
  partition: string;
  authCookieName: string;
  inputScript: string;
  responseScript: string;
}

const CONFIGS: Record<WebViewProvider, ProviderConfig> = {
  chatgpt: {
    loginUrl: 'https://chat.openai.com/auth/login',
    chatUrl: 'https://chat.openai.com/',
    newChatUrl: 'https://chat.openai.com/',
    partition: 'persist:chatgpt',
    authCookieName: '__Secure-next-auth.session-token',
    inputScript: `
      (async (msg) => {
        const input =
          document.querySelector('#prompt-textarea') ||
          document.querySelector('textarea[placeholder]') ||
          document.querySelector('[contenteditable="true"]');
        if (!input) return false;
        input.focus();
        if (input.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          setter?.call(input, msg);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          document.execCommand('insertText', false, msg);
        }
        await new Promise(r => setTimeout(r, 400));
        const btn =
          document.querySelector('[data-testid="send-button"]') ||
          document.querySelector('button[aria-label="Send message"]');
        btn?.click();
        return true;
      })(MSG_PLACEHOLDER)
    `,
    responseScript: `
      (() => {
        const msgs = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (!msgs.length) return { text: '', done: false };
        const last = msgs[msgs.length - 1];
        const stopBtn = document.querySelector('[data-testid="stop-button"]');
        return { text: last.innerText || last.textContent || '', done: !stopBtn };
      })()
    `,
  },
  gemini: {
    loginUrl: 'https://accounts.google.com/signin/v2/identifier?service=ahsid',
    chatUrl: 'https://gemini.google.com/app',
    newChatUrl: 'https://gemini.google.com/app',
    partition: 'persist:gemini',
    authCookieName: 'SID',
    inputScript: `
      (async (msg) => {
        const input =
          document.querySelector('rich-textarea .ql-editor') ||
          document.querySelector('[contenteditable][data-placeholder]') ||
          document.querySelector('[contenteditable="true"]');
        if (!input) return false;
        input.focus();
        document.execCommand('insertText', false, msg);
        await new Promise(r => setTimeout(r, 400));
        const btn =
          document.querySelector('button[aria-label="Send message"]') ||
          document.querySelector('.send-button') ||
          document.querySelector('button.mat-mdc-icon-button[type="submit"]');
        btn?.click();
        return true;
      })(MSG_PLACEHOLDER)
    `,
    responseScript: `
      (() => {
        const msgs =
          document.querySelectorAll('model-response .response-container') ||
          document.querySelectorAll('.model-response-text');
        if (!msgs.length) return { text: '', done: false };
        const last = msgs[msgs.length - 1];
        const isLoading = !!document.querySelector(
          '.loading-response, [aria-label="Stop response"], .streaming-indicator'
        );
        return { text: last.innerText || last.textContent || '', done: !isLoading };
      })()
    `,
  },
};

// Hidden persistent chat windows (one per provider)
const chatWindows = new Map<WebViewProvider, BrowserWindow>();

function getOrCreateChatWindow(provider: WebViewProvider): BrowserWindow {
  const existing = chatWindows.get(provider);
  if (existing && !existing.isDestroyed()) return existing;

  const cfg = CONFIGS[provider];
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      partition: cfg.partition,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL(cfg.chatUrl);
  win.on('closed', () => chatWindows.delete(provider));
  chatWindows.set(provider, win);
  return win;
}

export async function isConnected(provider: WebViewProvider): Promise<boolean> {
  const cfg = CONFIGS[provider];
  const ses = session.fromPartition(cfg.partition);
  const cookies = await ses.cookies.get({ name: cfg.authCookieName });
  return cookies.length > 0;
}

export function openLoginWindow(provider: WebViewProvider): Promise<boolean> {
  const cfg = CONFIGS[provider];
  const win = new BrowserWindow({
    width: 1000,
    height: 750,
    webPreferences: {
      partition: cfg.partition,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL(cfg.loginUrl);
  win.show();

  return new Promise(resolve => {
    let done = false;

    const poll = setInterval(async () => {
      const connected = await isConnected(provider);
      if (connected && !done) {
        done = true;
        clearInterval(poll);
        win.close();
        getOrCreateChatWindow(provider); // pre-warm
        resolve(true);
      }
    }, 1500);

    win.on('closed', () => {
      clearInterval(poll);
      if (!done) resolve(false);
    });
  });
}

export async function webviewChat(
  provider: WebViewProvider,
  message: string,
  senderContents: WebContents,
  convId: string
): Promise<void> {
  const cfg = CONFIGS[provider];
  const win = getOrCreateChatWindow(provider);

  if (win.webContents.isLoading()) {
    await new Promise<void>(r => win.webContents.once('did-finish-load', r));
    await new Promise(r => setTimeout(r, 2500));
  }

  // Navigate to new chat so conversations stay clean
  if (!win.webContents.getURL().includes(cfg.newChatUrl.replace('https://', ''))) {
    win.loadURL(cfg.newChatUrl);
    await new Promise<void>(r => win.webContents.once('did-finish-load', r));
    await new Promise(r => setTimeout(r, 3000));
  }

  const script = cfg.inputScript.replace('MSG_PLACEHOLDER', JSON.stringify(message));
  const sent = await win.webContents.executeJavaScript(script);

  if (!sent) {
    senderContents.send('webview:error', convId, `Cannot find input on ${provider}. Try reconnecting.`);
    return;
  }

  // Wait for response to begin
  await new Promise(r => setTimeout(r, 1200));

  let lastText = '';
  let stableCount = 0;
  let started = false;

  return new Promise(resolve => {
    const poll = setInterval(async () => {
      try {
        const result: { text: string; done: boolean } = await win.webContents.executeJavaScript(
          cfg.responseScript
        );

        if (result.text && result.text !== lastText) {
          const newChunk = result.text.slice(lastText.length);
          if (newChunk) {
            started = true;
            senderContents.send('webview:chunk', convId, newChunk);
          }
          lastText = result.text;
          stableCount = 0;
        } else if (started && result.done) {
          stableCount++;
          if (stableCount >= 4) {
            clearInterval(poll);
            senderContents.send('webview:done', convId);
            resolve();
          }
        }
      } catch {
        // transient JS error during page transitions — keep polling
      }
    }, 300);

    // 3-minute safety timeout
    setTimeout(() => {
      clearInterval(poll);
      if (started) {
        senderContents.send('webview:done', convId);
      } else {
        senderContents.send('webview:error', convId, 'Timeout: no response received.');
      }
      resolve();
    }, 180_000);
  });
}

export function disconnectProvider(provider: WebViewProvider): void {
  const win = chatWindows.get(provider);
  if (win && !win.isDestroyed()) win.close();
  chatWindows.delete(provider);
  session.fromPartition(CONFIGS[provider].partition).clearStorageData();
}
