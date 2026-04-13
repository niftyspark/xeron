'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI, type AppTheme } from '@/app/store/useUI';
import { Palette, Check, Moon, Sun, Layers, Zap } from 'lucide-react';

const themeConfig: Record<AppTheme, { name: string; icon: React.ElementType; color: string; description: string }> = {
  dark: {
    name: 'Dark',
    icon: Moon,
    color: 'text-blue-400',
    description: 'Default dark theme',
  },
  light: {
    name: 'Light',
    icon: Sun,
    color: 'text-amber-400',
    description: 'Clean light mode',
  },
  neumorphism: {
    name: 'Neumorphism',
    icon: Layers,
    color: 'text-purple-400',
    description: 'Soft extruded shadows',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    icon: Zap,
    color: 'text-cyan-400',
    description: 'Industrial neon style',
  },
};

export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const { appTheme } = useUI();
  const current = themeConfig[appTheme];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        title="Change theme"
      >
        <current.icon className={`w-4 h-4 ${current.color}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-2.5 border-b border-white/5">
                <p className="text-xs text-white/50 font-medium">Theme</p>
              </div>

              <div className="p-1.5">
                {(Object.keys(themeConfig) as AppTheme[]).map((theme) => {
                  const cfg = themeConfig[theme];
                  const isActive = appTheme === theme;
                  return (
                    <button
                      key={theme}
                      onClick={() => {
                        useUI.getState().setAppTheme(theme);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        isActive ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80">{cfg.name}</p>
                        <p className="text-[10px] text-white/30">{cfg.description}</p>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}