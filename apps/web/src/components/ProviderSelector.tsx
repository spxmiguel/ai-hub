'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Monitor } from 'lucide-react';
import { useChatStore } from '@/store';
import { cn } from '@/lib/cn';

const PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude',
    desktopOnly: false,
    models: [
      { id: 'claude-opus-4-5', label: 'Opus' },
      { id: 'claude-sonnet-4-5', label: 'Sonnet' },
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku' },
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    desktopOnly: true,
    models: [
      { id: 'chatgpt-default', label: 'Padrão' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    desktopOnly: true,
    models: [
      { id: 'gemini-default', label: 'Padrão' },
    ],
  },
] as const;

export default function ProviderSelector() {
  const { activeProvider, activeModel, setProvider, setModel } = useChatStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentProvider = PROVIDERS.find(p => p.id === activeProvider);
  const currentModel = currentProvider?.models.find(m => m.id === activeModel);
  const label = currentProvider
    ? `${currentProvider.name}${currentModel ? ` · ${currentModel.label}` : ''}`
    : 'Provider';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(providerId: string, modelId: string, desktopOnly: boolean) {
    if (desktopOnly) return;
    setProvider(providerId as typeof activeProvider);
    setModel(modelId);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors',
          open
            ? 'bg-white/10 text-foreground'
            : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
        )}
      >
        {label}
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          {PROVIDERS.map(provider => (
            <div key={provider.id}>
              <div className={cn(
                'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b border-white/5 flex items-center justify-between',
                provider.desktopOnly ? 'text-muted-foreground/50' : 'text-muted-foreground'
              )}>
                <span>{provider.name}</span>
                {provider.desktopOnly && (
                  <span className="flex items-center gap-0.5 text-[9px] font-normal normal-case tracking-normal text-muted-foreground/40">
                    <Monitor size={9} />
                    Desktop
                  </span>
                )}
              </div>
              {provider.models.map(model => {
                const active = activeProvider === provider.id && activeModel === model.id;
                const disabled = provider.desktopOnly;
                return (
                  <button
                    key={model.id}
                    onClick={() => select(provider.id, model.id, disabled)}
                    disabled={disabled}
                    title={disabled ? 'Disponível no app desktop' : undefined}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs transition-colors',
                      disabled
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : active
                        ? 'text-foreground bg-white/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    )}
                  >
                    {model.label}
                    {active && !disabled && <Check size={11} />}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="px-3 py-2 border-t border-white/5">
            <p className="text-[10px] text-muted-foreground/40 leading-tight">
              ChatGPT e Gemini disponíveis no app desktop.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
