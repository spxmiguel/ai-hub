'use client';

import type { Skill } from '@ai-hub/skills-registry';
import { cn } from '@/lib/cn';

interface Props {
  skills: Skill[];
  activeIds: string[];
  onToggle: (id: string) => void;
}

export default function SkillChips({ skills, activeIds, onToggle }: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {skills.map(s => {
        const active = activeIds.includes(s.id);
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            title={`~${s.tokenCost} tokens`}
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
              active
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-secondary text-muted-foreground border border-border hover:border-primary/30'
            )}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
