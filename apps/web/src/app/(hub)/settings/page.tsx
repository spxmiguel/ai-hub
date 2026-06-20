'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { BUILT_IN_SKILLS } from '@ai-hub/skills-registry';
import { CheckCircle, XCircle, LogOut, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { activeSkills, toggleSkill, apiKeys, setApiKey } = useChatStore();
  const { user, googleToken, signOut } = useAuth();
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [memoryLines, setMemoryLines] = useState<number | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (googleToken) headers['Authorization'] = `Bearer ${googleToken}`;
    fetch('/api/memory', { headers })
      .then(r => {
        setDriveConnected(r.ok);
        return r.ok ? r.text() : '';
      })
      .then(text => {
        if (text) setMemoryLines(text.split('\n').length);
      })
      .catch(() => setDriveConnected(false));
  }, [googleToken]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI Hub web configuration</p>
      </div>

      <div className="px-8 py-6 space-y-8 max-w-xl">
        {/* Account */}
        {user && (
          <section>
            <h2 className="text-sm font-semibold mb-3">Account</h2>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </section>
        )}

        {/* API Keys */}
        <section>
          <h2 className="text-sm font-semibold mb-1">API Keys</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Stored locally. Sent to your server only — never returned to browser.
          </p>
          <div className="space-y-3">
            {(
              [
                { provider: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
                { provider: 'openai', label: 'OpenAI (ChatGPT)', placeholder: 'sk-...' },
                { provider: 'gemini', label: 'Google (Gemini)', placeholder: 'AIza...' },
              ] as const
            ).map(({ provider, label, placeholder }) => (
              <div key={provider} className="bg-card border border-border rounded-xl px-4 py-3">
                <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showKey[provider] ? 'text' : 'password'}
                    value={apiKeys[provider]}
                    onChange={e => setApiKey(provider, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 font-mono"
                  />
                  <button
                    onClick={() => setShowKey(s => ({ ...s, [provider]: !s[provider] }))}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {showKey[provider] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {apiKeys[provider] && (
                    <button
                      onClick={() => setApiKey(provider, '')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Google Drive memory */}
        <section>
          <h2 className="text-sm font-semibold mb-3">Memory (Google Drive)</h2>
          <div className="bg-card border border-border rounded-xl p-4 text-sm space-y-3">
            <div className="flex items-center gap-2">
              {driveConnected === null ? (
                <span className="text-muted-foreground text-xs">Checking...</span>
              ) : driveConnected ? (
                <>
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-green-400 text-xs">Drive connected</span>
                  {memoryLines !== null && (
                    <span className="text-muted-foreground text-xs ml-auto">
                      {memoryLines} / 150 lines
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">
                    {googleToken ? 'Drive unavailable' : 'Sign in to enable Drive memory'}
                  </span>
                </>
              )}
            </div>
            {driveConnected && memoryLines !== null && (
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (memoryLines / 150) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              AI learns about you over time. Memory stored in <span className="font-mono">ai-hub-memory.md</span> on your Drive.
            </p>
          </div>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-sm font-semibold mb-1">Default Skills</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Active by default on every new conversation.
          </p>
          <div className="space-y-2">
            {BUILT_IN_SKILLS.map(s => {
              const active = activeSkills.includes(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.systemPrompt.slice(0, 80)}...</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground">~{s.tokenCost}t</span>
                    <button
                      onClick={() => toggleSkill(s.id)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        active ? 'bg-primary' : 'bg-secondary border border-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                          active ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
