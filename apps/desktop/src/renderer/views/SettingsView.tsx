import { useEffect, useState } from 'react';
import { Settings, Eye, EyeOff, Check, Wifi, WifiOff, Loader2 } from 'lucide-react';

type ConnStatus = 'unknown' | 'connected' | 'disconnected' | 'loading';

export default function SettingsView() {
  const [claudeKey, setClaudeKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [memMode, setMemMode] = useState<'lite' | 'normal'>('lite');
  const [lineCount, setLineCount] = useState(0);
  const [connStatus, setConnStatus] = useState<Record<string, ConnStatus>>({
    chatgpt: 'unknown',
    gemini: 'unknown',
  });

  useEffect(() => {
    (async () => {
      const cfg = await window.hub.config.load();
      setMemMode(cfg.memoryMode);
      setLineCount(await window.hub.memory.lineCount());
      const k = await window.hub.keystore.get('claude');
      if (k) setClaudeKey(k);
      checkStatus('chatgpt');
      checkStatus('gemini');
    })();
  }, []);

  async function checkStatus(provider: string) {
    setConnStatus(s => ({ ...s, [provider]: 'loading' }));
    const connected = await window.hub.webview.status(provider);
    setConnStatus(s => ({ ...s, [provider]: connected ? 'connected' : 'disconnected' }));
  }

  async function handleLogin(provider: string) {
    setConnStatus(s => ({ ...s, [provider]: 'loading' }));
    const ok = await window.hub.webview.login(provider);
    setConnStatus(s => ({ ...s, [provider]: ok ? 'connected' : 'disconnected' }));
  }

  async function handleLogout(provider: string) {
    setConnStatus(s => ({ ...s, [provider]: 'loading' }));
    await window.hub.webview.logout(provider);
    setConnStatus(s => ({ ...s, [provider]: 'disconnected' }));
  }

  async function saveClaudeKey() {
    if (!claudeKey.trim()) return;
    await window.hub.keystore.set('claude', claudeKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  async function changeMode(mode: 'lite' | 'normal') {
    setMemMode(mode);
    await window.hub.config.save({ memoryMode: mode });
  }

  const webviewProviders = [
    { id: 'chatgpt', label: 'ChatGPT' },
    { id: 'gemini', label: 'Gemini' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border drag-region">
        <div className="no-drag flex items-center gap-2">
          <Settings size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-xl">
        {/* Claude API Key */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Claude API Key
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Usa o plano da sua conta (Max ou Pro). Tokens debitados da sua assinatura.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">Anthropic (Claude)</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-card border border-border rounded-lg px-3 gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={claudeKey}
                  onChange={e => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none py-2 placeholder:text-muted-foreground/50 selectable"
                />
                <button
                  onClick={() => setShowKey(s => !s)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={saveClaudeKey}
                className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
              >
                {keySaved ? <><Check size={12} /> Salvo</> : 'Salvar'}
              </button>
            </div>
          </div>
        </section>

        {/* WebView Connections */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Contas Conectadas
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Usa sua conta existente. Sem API key necessária.
          </p>
          <div className="space-y-3">
            {webviewProviders.map(p => {
              const status = connStatus[p.id];
              const isConnected = status === 'connected';
              const isLoading = status === 'loading';
              return (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-card border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected ? 'bg-green-500' :
                      isLoading ? 'bg-yellow-500 animate-pulse' :
                      'bg-muted-foreground/40'
                    }`} />
                    <div>
                      <p className="text-sm text-foreground">{p.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {isConnected ? 'Conectado' : isLoading ? 'Verificando...' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                  {isLoading ? (
                    <Loader2 size={15} className="text-muted-foreground animate-spin" />
                  ) : isConnected ? (
                    <button
                      onClick={() => handleLogout(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <WifiOff size={12} />
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLogin(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Wifi size={12} />
                      Conectar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Memory */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Memória
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{lineCount} / 150 linhas</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (lineCount / 150) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['lite', 'normal'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => changeMode(mode)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                    ${memMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Lite</strong> — salva só blocos marcados com [MEMORY].<br />
              <strong className="text-foreground">Normal</strong> — também salva turns resumidos automaticamente.
            </p>
            <button
              onClick={async () => {
                await window.hub.memory.compact();
                setLineCount(await window.hub.memory.lineCount());
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Compactar agora
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
