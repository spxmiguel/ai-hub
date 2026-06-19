export interface Skill {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tokenCost: number;
  defaultOn?: boolean;
}

export const BUILT_IN_SKILLS: Skill[] = [
  {
    id: 'caveman',
    name: 'Caveman',
    description: 'Terse responses. Saves tokens.',
    systemPrompt: 'Terse. No pleasantries. Answer directly. Fragments OK. Save tokens.',
    tokenCost: 35,
    defaultOn: true,
  },
  {
    id: 'ui-ux-pro',
    name: 'UI/UX Pro',
    description: 'Expert UI/UX with shadcn + Tailwind.',
    systemPrompt:
      'Expert UI/UX. Use shadcn/ui. WCAG 2.1 AA. Tailwind utilities. 8px grid. Dark-mode first. Semantic HTML.',
    tokenCost: 80,
  },
  {
    id: 'code-mode',
    name: 'Code',
    description: 'Full files, TypeScript strict, no snippets.',
    systemPrompt:
      'Implementation focus. Show working code. TypeScript strict. Functional. No snippets — full files.',
    tokenCost: 45,
  },
  {
    id: 'design',
    name: 'Design',
    description: 'Product designer mode — visual, Figma-ready.',
    systemPrompt:
      'Expert product designer. Visual hierarchy, spacing, color theory, user flow. UI code: Tailwind + shadcn/ui. 8px grid. Figma-ready descriptions on request.',
    tokenCost: 70,
  },
];

export function getDefaultSkills(): Skill[] {
  return BUILT_IN_SKILLS.filter(s => s.defaultOn);
}

export function getSkillById(id: string): Skill | undefined {
  return BUILT_IN_SKILLS.find(s => s.id === id);
}

export function composeSystemPrompt(opts: {
  memory?: string;
  activeSkillIds: string[];
  customInstruction?: string;
}): string {
  const parts: string[] = [];

  if (opts.memory?.trim()) {
    parts.push(`<memory>\n${opts.memory.trim()}\n</memory>`);
  }

  const skills = opts.activeSkillIds
    .map(id => BUILT_IN_SKILLS.find(s => s.id === id))
    .filter((s): s is Skill => s !== undefined);

  if (skills.length > 0) {
    parts.push(skills.map(s => s.systemPrompt).join('\n'));
  }

  if (opts.customInstruction?.trim()) {
    parts.push(opts.customInstruction.trim());
  }

  return parts.join('\n\n');
}

export function estimateTokenCost(activeSkillIds: string[]): number {
  return activeSkillIds.reduce((acc, id) => {
    const skill = BUILT_IN_SKILLS.find(s => s.id === id);
    return acc + (skill?.tokenCost ?? 0);
  }, 0);
}
