import type { Skill } from '@ai-hub/skills-registry';
import { useChatStore } from '../store';

interface Props {
  skills: Skill[];
  activeIds: string[];
}

export default function SkillChips({ skills, activeIds }: Props) {
  const { toggleSkill } = useChatStore();

  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map(skill => {
        const active = activeIds.includes(skill.id);
        return (
          <button
            key={skill.id}
            onClick={() => toggleSkill(skill.id)}
            title={`~${skill.tokenCost} tokens`}
            className={`
              px-2.5 py-1 rounded-full text-xs font-medium transition-colors
              ${active
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-secondary text-muted-foreground border border-transparent hover:border-border'
              }
            `}
          >
            {skill.name}
          </button>
        );
      })}
    </div>
  );
}
