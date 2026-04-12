'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SkillState {
  enabledSkills: string[];
  toggleSkill: (skillId: string) => void;
  enableSkill: (skillId: string) => void;
  disableSkill: (skillId: string) => void;
  isSkillEnabled: (skillId: string) => boolean;
}

export const useSkills = create<SkillState>()(
  persist(
    (set, get) => ({
      enabledSkills: ['code-generator', 'code-analyzer', 'summarizer', 'math-solver'],
      toggleSkill: (skillId) =>
        set((s) => ({
          enabledSkills: s.enabledSkills.includes(skillId)
            ? s.enabledSkills.filter((id) => id !== skillId)
            : [...s.enabledSkills, skillId],
        })),
      enableSkill: (skillId) =>
        set((s) => ({
          enabledSkills: s.enabledSkills.includes(skillId)
            ? s.enabledSkills
            : [...s.enabledSkills, skillId],
        })),
      disableSkill: (skillId) =>
        set((s) => ({
          enabledSkills: s.enabledSkills.filter((id) => id !== skillId),
        })),
      isSkillEnabled: (skillId) => get().enabledSkills.includes(skillId),
    }),
    { name: 'xeron-skills', skipHydration: true }
  )
);
