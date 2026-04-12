'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI, type AppTheme } from '@/app/store/useUI';
import { Palette, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

const themeConfig: Record<AppTheme, { name: string; icon: string; description: string }> = {
  glassmorphism: { 
    name: 'Glassmorphism', 
    icon: '🔮', 
    description: 'Translucent blurred layers' 
  },
  neumorphism: { 
    name: 'Neumorphism', 
    icon: '🎨', 
    description: 'Soft extruded elements' 
  },
  minimalist: { 
    name: 'Minimalist Air', 
    icon: '💨', 
    description: 'Clean modern simplicity' 
  },
  bento: { 
    name: 'Bento Grids', 
    icon: '📦', 
    description: 'Modular grid layout' 
  },
  neoskeu: { 
    name: 'Neo-Skeuomorphism', 
    icon: '✨', 
    description: '3D with modern flair' 
  },
};

export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const { appTheme, cycleTheme } = useUI();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-white/40 hover:text-white"
        title="Change theme"
      >
        <Palette className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{themeConfig[appTheme].name}</span>
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-64 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-3 border-b border-white/5">
                <p className="text-sm text-white/70 font-medium">Choose Theme</p>
              </div>

              <div className="p-2">
                {(Object.keys(themeConfig) as AppTheme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => {
                      useUI.getState().setAppTheme(theme);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      appTheme === theme 
                        ? 'bg-blue-600/10 border border-blue-500/30' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg">{themeConfig[theme].icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80">{themeConfig[theme].name}</p>
                      <p className="text-[11px] text-white/30">{themeConfig[theme].description}</p>
                    </div>
                    {appTheme === theme && (
                      <Check className="w-4 h-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-3 border-t border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cycleTheme}
                  className="w-full justify-between"
                >
                  <span className="text-xs text-white/50">Next theme</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}