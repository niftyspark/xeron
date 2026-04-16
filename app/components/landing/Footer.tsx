'use client';

import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative py-12 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white/80">XERON</span>
        </div>
        
        <p className="text-sm text-white/30">
          Autonomous AI Agent Platform
        </p>

          <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            Docs
          </a>
          <a href="#" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
