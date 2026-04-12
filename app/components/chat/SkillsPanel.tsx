'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/app/store/useUI';
import { useSkills } from '@/app/store/useSkills';
import { X, Zap, Check, Code, FileText, Globe, Database, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

const categoryIcons: Record<string, React.ElementType> = {
  code: Code,
  text: FileText,
  search: Globe,
  data: Database,
  creative: Sparkles,
};

export function SkillsPanel() {
  const { skillsPanelOpen, setSkillsPanelOpen } = useUI();
  const { enabledSkills, toggleSkill, allSkills } = useSkills();

  return (
    <AnimatePresence>
      {skillsPanelOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute left-0 bottom-full mb-2 w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-white font-medium">Skills</span>
              <Badge variant="secondary" className="text-[10px]">
                {enabledSkills.length} active
              </Badge>
            </div>
            <button onClick={() => setSkillsPanelOpen(false)}>
              <X className="w-4 h-4 text-white/30 hover:text-white" />
            </button>
          </div>

          <div className="p-2 max-h-80 overflow-y-auto">
            {allSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  enabledSkills.some(s => s.id === skill.id)
                    ? 'bg-amber-600/10 border border-amber-500/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  enabledSkills.some(s => s.id === skill.id)
                    ? 'bg-amber-500/20'
                    : 'bg-white/5'
                }`}>
                  {categoryIcons[skill.category] ? (
                    React.createElement(categoryIcons[skill.category], {
                      className: `w-4 h-4 ${
                        enabledSkills.some(s => s.id === skill.id)
                          ? 'text-amber-400'
                          : 'text-white/40'
                      }`,
                    })
                  ) : (
                    <Zap className={`w-4 h-4 ${
                      enabledSkills.some(s => s.id === skill.id)
                        ? 'text-amber-400'
                        : 'text-white/40'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{skill.name}</p>
                  <p className="text-[11px] text-white/30 truncate">{skill.description}</p>
                </div>
                {enabledSkills.some(s => s.id === skill.id) && (
                  <Check className="w-4 h-4 text-amber-400" />
                )}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-white/50"
              onClick={() => window.location.href = '/dashboard/skills'}
            >
              View all skills →
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}