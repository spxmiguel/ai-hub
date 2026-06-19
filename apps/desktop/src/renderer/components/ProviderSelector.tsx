import { useChatStore } from '../store';

const PROVIDERS = [
  { id: 'claude', label: 'Claude', models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'] },
  { id: 'openai', label: 'GPT', models: ['gpt-4o', 'gpt-4o-mini', 'o3'] },
  { id: 'gemini', label: 'Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'] },
  { id: 'ollama', label: 'Ollama', models: [] },
];

export default function ProviderSelector() {
  const { activeProvider, activeModel, setProvider, setModel } = useChatStore();
  const provider = PROVIDERS.find(p => p.id === activeProvider) ?? PROVIDERS[0];

  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-secondary rounded-lg p-0.5 gap-0.5">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => {
              setProvider(p.id);
              if (p.models.length) setModel(p.models[0]);
            }}
            className={`
              px-2.5 py-1 rounded-md text-xs font-medium transition-colors
              ${activeProvider === p.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {provider.models.length > 0 && (
        <select
          value={activeModel}
          onChange={e => setModel(e.target.value)}
          className="bg-transparent text-xs text-muted-foreground outline-none cursor-pointer hover:text-foreground"
        >
          {provider.models.map(m => (
            <option key={m} value={m} className="bg-card">{m}</option>
          ))}
        </select>
      )}
    </div>
  );
}
