'use client';

import { useState, useEffect, useRef } from 'react';
import { useUI } from '@/app/store/useUI';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Zap, Wrench, Calendar, Brain,
  Cpu, BookOpen, History, Settings, Search, Sliders,
} from 'lucide-react';

const commands = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/dashboard' },
  { id: 'skills', label: 'Skills', icon: Zap, href: '/dashboard/skills' },
  { id: 'tools', label: 'Tools', icon: Wrench, href: '/dashboard/tools' },
  { id: 'tasks', label: 'Scheduled Tasks', icon: Calendar, href: '/dashboard/tasks' },
  { id: 'memory', label: 'Memory', icon: Brain, href: '/dashboard/memory' },
  { id: 'models', label: 'Model Catalog', icon: Cpu, href: '/dashboard/models' },
  { id: 'learning', label: 'Learning Log', icon: BookOpen, href: '/dashboard/learning' },
  { id: 'history', label: 'History', icon: History, href: '/dashboard/history' },
  { id: 'preferences', label: 'Preferences', icon: Sliders, href: '/dashboard/preferences' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUI();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch('');
      inputRef.current?.focus();
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setCommandPaletteOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search className="w-5 h-5 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm"
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd className="text-[10px] text-white/30 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
            ESC
          </kbd>
        </div>

        <div className="py-2 max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-white/30">
              No commands found
            </div>
          )}
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                router.push(cmd.href);
                setCommandPaletteOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
            >
              <cmd.icon className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/70">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
